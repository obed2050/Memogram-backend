const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize, User, School, SchoolHistory, Community, CommunityEvent,
  Club, ClubMember, Post, Follow, Like,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { cacheGet, cacheSet } = require('../services/redis.service');

const PAGE_SIZE = 20;
const PREVIEW_SIZE = 3;
const SEARCH_TTL = 120;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || PAGE_SIZE));
  return { page, limit, offset: (page - 1) * limit };
}

// GET /api/search?q=...&type=users|schools|communities|events|clubs|reels|memories|all
exports.search = async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    if (!q || !q.trim()) return sendSuccess(res, { results: {} });

    const query = q.trim();
    const cacheKey = `search:${type}:${query.toLowerCase()}:${req.query.page || 1}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return sendSuccess(res, cached);

    let result;

    if (type === 'all') {
      const [users, schools, communities, events, clubs, reels, memories] = await Promise.all([
        searchUsers(query, 0, PREVIEW_SIZE, req.userId),
        searchSchools(query, 0, PREVIEW_SIZE),
        searchCommunities(query, 0, PREVIEW_SIZE),
        searchEvents(query, 0, PREVIEW_SIZE),
        searchClubs(query, 0, PREVIEW_SIZE),
        searchReels(query, 0, PREVIEW_SIZE, req.userId),
        searchMemories(query, 0, PREVIEW_SIZE, req.userId),
      ]);
      result = {
        results: { users, schools, communities, events, clubs, reels, memories },
      };
    } else {
      const { page, limit, offset } = parsePagination(req.query);
      const searchers = {
        users: () => searchUsers(query, offset, limit, req.userId),
        schools: () => searchSchools(query, offset, limit),
        communities: () => searchCommunities(query, offset, limit),
        events: () => searchEvents(query, offset, limit),
        clubs: () => searchClubs(query, offset, limit),
        reels: () => searchReels(query, offset, limit, req.userId),
        memories: () => searchMemories(query, offset, limit, req.userId),
      };

      if (!searchers[type]) {
        return sendError(res, 'Invalid search type', 400);
      }

      const data = await searchers[type]();
      result = { ...data, page, type };
    }

    await cacheSet(cacheKey, result, SEARCH_TTL);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- helpers ---

async function searchUsers(query, offset, limit, userId) {
  const { count, rows } = await User.findAndCountAll({
    where: {
      [Op.or]: [
        { fullName: { [Op.iLike]: `%${query}%` } },
        { username: { [Op.iLike]: `%${query}%` } },
      ],
    },
    attributes: { exclude: ['password', 'email'] },
    limit,
    offset,
    subQuery: false,
  });

  const userIds = rows.map((u) => u.id);
  const [followerCounts, followingRows] = await Promise.all>(
    userId ? [
      Follow.findAll({
        attributes: ['followingId', [fn('COUNT', col('followerId')), 'count']],
        where: { followingId: { [Op.in]: userIds } },
        group: ['followingId'],
      }),
      Follow.findAll({
        where: { followerId: userId, followingId: { [Op.in]: userIds } },
        attributes: ['followingId'],
      }),
    ] : [Promise.resolve([]), Promise.resolve([])]
  );

  const fcMap = {};
  followerCounts.forEach((r) => { fcMap[r.followingId] = parseInt(r.get('count')); });
  const followingSet = new Set(followingRows.map((r) => r.followingId));

  return {
    items: rows.map((u) => ({
      ...u.toJSON(),
      followerCount: fcMap[u.id] || 0,
      isFollowing: followingSet.has(u.id),
    })),
    total: count,
  };
}

async function searchSchools(query, offset, limit) {
  const { count, rows } = await School.findAndCountAll({
    where: { name: { [Op.iLike]: `%${query}%` } },
    attributes: {
      include: [[fn('COUNT', col('students.id')), 'memberCount']],
    },
    include: [{ model: SchoolHistory, as: 'students', attributes: [] }],
    group: ['School.id'],
    limit,
    offset,
    subQuery: false,
  });

  return { items: rows, total: count };
}

async function searchCommunities(query, offset, limit) {
  const { count, rows } = await Community.findAndCountAll({
    where: {
      [Op.or]: [
        { description: { [Op.iLike]: `%${query}%` } },
        { '$school.name$': { [Op.iLike]: `%${query}%` } },
      ],
    },
    include: [{ model: School, as: 'school', attributes: ['id', 'name', 'location', 'logo'] }],
    limit,
    offset,
    subQuery: false,
  });

  return { items: rows, total: count };
}

async function searchEvents(query, offset, limit) {
  const { count, rows } = await CommunityEvent.findAndCountAll({
    where: {
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
      ],
    },
    include: [
      { model: School, as: 'school', attributes: ['id', 'name'] },
      { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
    ],
    order: [['eventDate', 'DESC']],
    limit,
    offset,
    subQuery: false,
  });

  return { items: rows, total: count };
}

async function searchClubs(query, offset, limit) {
  const { count, rows } = await Club.findAndCountAll({
    where: {
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
      ],
    },
    include: [
      { model: School, as: 'school', attributes: ['id', 'name'] },
      { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
    ],
    limit,
    offset,
    subQuery: false,
  });

  return { items: rows, total: count };
}

async function searchReels(query, offset, limit, userId) {
  const { count, rows } = await Post.findAndCountAll({
    where: {
      type: 'reel',
      visibility: 'public',
      content: { [Op.iLike]: `%${query}%` },
    },
    include: [
      { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      { model: School, as: 'school', attributes: ['id', 'name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    subQuery: false,
  });

  const ids = rows.map((r) => r.id);
  const liked = userId ? await Like.findAll({
    where: { userId, postId: { [Op.in]: ids } },
  }) : [];
  const likedSet = new Set(liked.map((l) => l.postId));

  return {
    items: rows.map((r) => ({ ...r.toJSON(), isLiked: likedSet.has(r.id) })),
    total: count,
  };
}

async function searchMemories(query, offset, limit, userId) {
  const { count, rows } = await Post.findAndCountAll({
    where: {
      type: 'memory',
      visibility: 'public',
      [Op.or]: [
        { content: { [Op.iLike]: `%${query}%` } },
      ],
    },
    include: [
      { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      { model: School, as: 'school', attributes: ['id', 'name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    subQuery: false,
  });

  const ids = rows.map((r) => r.id);
  const liked = userId ? await Like.findAll({
    where: { userId, postId: { [Op.in]: ids } },
  }) : [];
  const likedSet = new Set(liked.map((l) => l.postId));

  return {
    items: rows.map((r) => ({ ...r.toJSON(), isLiked: likedSet.has(r.id) })),
    total: count,
  };
}
