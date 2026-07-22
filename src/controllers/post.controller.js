const { Op } = require('sequelize');
const { Post, User, School, Follow, Comment, Like } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');
const { updateStreak } = require('../controllers/streak.controller');
const { checkAndAward } = require('../services/achievementService');
const { generateBadges } = require('../services/badgeService');
const { autoTagPost } = require('../services/recommendationEngine');
const { trackPostEngagement } = require('../services/redis.service');
const { cacheGet, cacheSet } = require('../services/redis.service');
const { invalidatePattern } = require('../middlewares/cache');

const enrichAuthorsWithBadges = async (posts) => {
  const authorIds = [...new Set(posts.map((p) => p.author?.id).filter(Boolean))];
  const badgeMap = {};
  for (const id of authorIds) {
    try { badgeMap[id] = await generateBadges(id); } catch { badgeMap[id] = []; }
  }
  posts.forEach((p) => {
    if (p.author?.id) p.author.badges = badgeMap[p.author.id] || [];
  });
  return posts;
};

exports.createPost = async (req, res) => {
  try {
    const { content, type, visibility, schoolId, generation } = req.body;

    let imageUrls = [];
    let videoUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'memogram/posts');
        if (file.mimetype.startsWith('video/')) {
          videoUrls.push(result.url);
        } else {
          imageUrls.push(result.url);
        }
      }
    }

    const post = await Post.create({
      userId: req.userId,
      content,
      images: imageUrls,
      videos: videoUrls,
      type: type || 'post',
      visibility: visibility || 'public',
      schoolId: schoolId || null,
      generation: generation || null,
    });

    const fullPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
    });

    let streakData = null;
    if (post.type === 'memory') {
      streakData = await updateStreak(req.userId);
    }

    const triggerIds = ['first_post'];
    if (post.type === 'memory') triggerIds.push('first_memory');
    const newAchievements = await checkAndAward(req.userId, triggerIds);

    const postData = fullPost.toJSON();
    postData.author.badges = await generateBadges(req.userId);

    autoTagPost(post.id, content).catch(() => {});
    trackPostEngagement(post.id, post.type || 'post', 5).catch(() => {});
    invalidatePattern('explore:*').catch(() => {});
    invalidatePattern(`recs:${req.userId}:*`).catch(() => {});

    return sendSuccess(res, { post: postData, streak: streakData, newAchievements }, 'Post created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const cacheKey = `feed:${req.userId}:${page}:${limit}:${type || 'all'}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return sendSuccess(res, cached);

    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const following = await Follow.findAll({ where: { followerId: req.userId } });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(req.userId);

    const userInstance = await User.findByPk(req.userId);
    const userSchools = userInstance ? await userInstance.getSchools() : [];
    const schoolIds = userSchools.map((s) => s.id);

    const where = {
      [Op.or]: [
        { userId: { [Op.in]: followingIds } },
        { schoolId: { [Op.in]: schoolIds } },
      ],
      visibility: { [Op.ne]: 'private' },
    };

    if (type && ['post', 'memory', 'reel'].includes(type)) {
      where.type = type;
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const postsWithLikeStatus = await Promise.all(
      posts.map(async (post) => {
        const liked = await Like.findOne({ where: { userId: req.userId, postId: post.id } });
        const postData = post.toJSON();
        postData.isLiked = !!liked;
        return postData;
      })
    );

    await enrichAuthorsWithBadges(postsWithLikeStatus);

    const result = paginateResponse(postsWithLikeStatus, count, parseInt(page), queryLimit);
    await cacheSet(cacheKey, result, 60);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
    });

    if (!post) {
      return sendError(res, 'Post not found', 404);
    }

    const postData = post.toJSON();

    if (req.userId) {
      const liked = await Like.findOne({ where: { userId: req.userId, postId: id } });
      postData.isLiked = !!liked;
    }

    if (postData.author?.id) {
      postData.author.badges = await generateBadges(postData.author.id);
    }

    return sendSuccess(res, { post: postData });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findByPk(id);
    if (!post) {
      return sendError(res, 'Post not found', 404);
    }

    if (post.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    await post.destroy();
    invalidatePattern('explore:*').catch(() => {});
    invalidatePattern(`feed:${req.userId}:*`).catch(() => {});
    invalidatePattern('recs:*').catch(() => {});
    return sendSuccess(res, null, 'Post deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { userId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const postsData = posts.map((p) => p.toJSON());
    await enrichAuthorsWithBadges(postsData);

    const result = paginateResponse(postsData, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
