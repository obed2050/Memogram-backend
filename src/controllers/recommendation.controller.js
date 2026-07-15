const {
  getRecommendations, getSimilarPosts, trackInteraction, autoTagPost, getRecommendationStats,
} = require('../services/recommendationEngine');
const { sendSuccess, sendError } = require('../utils/response');
const { cacheGet, cacheSet } = require('../services/redis.service');

exports.getRecommendations = async (req, res) => {
  try {
    const { page = 1, limit = 20, refresh } = req.query;
    const cacheKey = `recs:${req.userId}:${page}:${limit}`;

    if (refresh !== 'true') {
      const cached = await cacheGet(cacheKey);
      if (cached) return sendSuccess(res, cached);
    }

    const posts = await getRecommendations(req.userId, {
      limit: parseInt(limit),
      page: parseInt(page),
      forceRefresh: refresh === 'true',
    });

    const data = { posts, count: posts.length };
    await cacheSet(cacheKey, data, 180);

    return sendSuccess(res, data);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getSimilarPosts = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10 } = req.query;
    const posts = await getSimilarPosts(postId, parseInt(limit));
    return sendSuccess(res, { posts });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.trackInteraction = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type, dwellTime, metadata } = req.body;

    if (!['view', 'like', 'comment', 'save', 'share', 'click'].includes(type)) {
      return sendError(res, 'Invalid interaction type', 400);
    }

    await trackInteraction(req.userId, postId, type, { dwellTime, ...metadata });
    return sendSuccess(res, null, 'Interaction tracked');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.autoTag = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    await autoTagPost(postId, content);
    return sendSuccess(res, null, 'Post tagged');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await getRecommendationStats(req.userId);
    return sendSuccess(res, stats);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
