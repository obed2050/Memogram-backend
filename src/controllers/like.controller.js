const { Like, Post, User, Notification } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { checkAndAward } = require('../services/achievementService');
const { trackInteraction } = require('../services/recommendationEngine');
const { trackPostEngagement } = require('../services/redis.service');
const { invalidatePattern } = require('../middlewares/cache');

exports.toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findByPk(postId);
    if (!post) {
      return sendError(res, 'Post not found', 404);
    }

    const existingLike = await Like.findOne({ where: { userId: req.userId, postId } });

    if (existingLike) {
      await existingLike.destroy();
      await Post.decrement('likesCount', { where: { id: postId } });
      trackInteraction(req.userId, postId, 'like', { action: 'unlike' }).catch(() => {});
      return sendSuccess(res, { liked: false }, 'Post unliked');
    }

    await Like.create({ userId: req.userId, postId });
    await Post.increment('likesCount', { where: { id: postId } });
    trackInteraction(req.userId, postId, 'like', { action: 'like' }).catch(() => {});
    trackPostEngagement(postId, post.type, 2).catch(() => {});
    invalidatePattern(`explore:*`).catch(() => {});

    if (post.userId !== req.userId) {
      await Notification.create({
        userId: post.userId,
        senderId: req.userId,
        type: 'like',
        postId,
        content: 'liked your post',
      });
    }

    await checkAndAward(post.userId, ['likes_10', 'likes_100', 'likes_500', 'likes_1000']);

    return sendSuccess(res, { liked: true }, 'Post liked');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getPostLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: likes } = await Like.findAndCountAll({
      where: { postId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    return sendSuccess(res, { users: likes.map((l) => l.user), total: count });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
