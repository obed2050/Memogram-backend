const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize, Post, User, School, SchoolHistory, Club, ClubMember, Follow, Like,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { cacheGet, cacheSet } = require('../services/redis.service');

const EXPLORE_CACHE_KEY = (userId) => `explore:${userId}`;
const EXPLORE_TTL = 300;

exports.getExplore = async (req, res) => {
  try {
    const cached = await cacheGet(EXPLORE_CACHE_KEY(req.userId));
    if (cached) return sendSuccess(res, cached);

    const [
      trendingReels,
      popularMemories,
      trendingSchools,
      popularUsers,
      trendingHashtags,
    ] = await Promise.all([
      getTrendingReels(req.userId),
      getPopularMemories(req.userId),
      getTrendingSchools(),
      getPopularUsers(req.userId),
      getTrendingHashtags(),
    ]);

    const data = {
      trendingReels,
      popularMemories,
      trendingSchools,
      popularUsers,
      trendingHashtags,
    };

    await cacheSet(EXPLORE_CACHE_KEY(req.userId), data, EXPLORE_TTL);

    return sendSuccess(res, data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- internal helpers ---

async function getTrendingReels(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30);

  const reels = await Post.findAll({
    where: {
      type: 'reel',
      visibility: 'public',
      createdAt: { [Op.gte]: sevenDaysAgo },
    },
    include: [
      { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      { model: School, as: 'school', attributes: ['id', 'name'], required: false },
    ],
    order: [
      [literal('"likesCount" + "commentsCount"'), 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit: 10,
    subQuery: false,
  });

  const reelIds = reels.map((r) => r.id);
  const liked = await Like.findAll({
    where: { userId, postId: { [Op.in]: reelIds } },
  });
  const likedSet = new Set(liked.map((l) => l.postId));

  return reels.map((r) => ({ ...r.toJSON(), isLiked: likedSet.has(r.id) }));
}

async function getPopularMemories(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const memories = await Post.findAll({
    where: {
      type: 'memory',
      visibility: 'public',
      createdAt: { [Op.gte]: thirtyDaysAgo },
    },
    include: [
      { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      { model: School, as: 'school', attributes: ['id', 'name'], required: false },
    ],
    order: [
      [literal('"likesCount" + "commentsCount"'), 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit: 12,
    subQuery: false,
  });

  const ids = memories.map((m) => m.id);
  const liked = await Like.findAll({
    where: { userId, postId: { [Op.in]: ids } },
  });
  const likedSet = new Set(liked.map((l) => l.postId));

  return memories.map((m) => ({ ...m.toJSON(), isLiked: likedSet.has(m.id) }));
}

async function getTrendingSchools() {
  const schools = await School.findAll({
    attributes: {
      include: [
        [fn('COUNT', col('students.id')), 'memberCount'],
      ],
    },
    include: [
      { model: User, as: 'students', attributes: [], through: { attributes: [] } },
    ],
    group: ['School.id'],
    order: [[literal('"memberCount"'), 'DESC']],
    limit: 10,
    subQuery: false,
  });

  return schools.map((s) => {
    const plain = s.toJSON();
    const letter = plain.name ? plain.name.charAt(0).toUpperCase() : '?';
    plain.initial = letter;
    return plain;
  });
}

async function getPopularUsers(userId) {
  const users = await User.findAll({
    attributes: {
      include: [
        [fn('COUNT', col('followers.id')), 'followerCount'],
      ],
    },
    include: [
      {
        model: User,
        as: 'followers',
        attributes: [],
        through: { attributes: [] },
      },
    ],
    group: ['User.id'],
    order: [[literal('"followerCount"'), 'DESC']],
    limit: 10,
    subQuery: false,
  });

  const userIds = users.map((u) => u.id);
  const following = await Follow.findAll({
    where: { followerId: userId, followingId: { [Op.in]: userIds } },
  });
  const followingSet = new Set(following.map((f) => f.followingId));

  return users.map((u) => {
    const plain = u.toJSON();
    delete plain.password;
    delete plain.email;
    plain.isFollowing = followingSet.has(u.id);
    return plain;
  });
}

async function getTrendingHashtags() {
  const posts = await Post.findAll({
    where: {
      content: { [Op.ne]: null },
      visibility: 'public',
    },
    attributes: ['content', 'likesCount', 'commentsCount'],
    order: [['createdAt', 'DESC']],
    limit: 500,
  });

  const tagCounts = {};
  for (const post of posts) {
    if (!post.content) continue;
    const tags = post.content.match(/#\w+/g);
    if (!tags) continue;
    for (const tag of tags) {
      const normalized = tag.toLowerCase();
      if (!tagCounts[normalized]) {
        tagCounts[normalized] = { tag: normalized, count: 0, engagement: 0 };
      }
      tagCounts[normalized].count += 1;
      tagCounts[normalized].engagement += (post.likesCount || 0) + (post.commentsCount || 0);
    }
  }

  return Object.values(tagCounts)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 20);
}
