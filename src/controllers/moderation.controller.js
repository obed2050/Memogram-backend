const { Op } = require('sequelize');
const {
  User, Post, Comment, CommunityEvent, ModerationLog,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');

const logAction = async (action, adminId, { targetUserId, targetPostId, targetCommentId, targetEventId, reason, meta }) => {
  return ModerationLog.create({
    action,
    adminId,
    targetUserId: targetUserId || null,
    targetPostId: targetPostId || null,
    targetCommentId: targetCommentId || null,
    targetEventId: targetEventId || null,
    reason: reason || null,
    meta: meta || null,
  });
};

// ─── Delete Post (moderated) ────────────────────────────────────
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const post = await Post.findByPk(id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'username'] }],
    });
    if (!post) return sendError(res, 'Post not found', 404);

    await logAction('delete_post', req.userId, {
      targetUserId: post.userId,
      targetPostId: post.id,
      reason,
      meta: { postType: post.type, postContent: post.content?.substring(0, 200) },
    });

    await Comment.destroy({ where: { postId: id } });
    await post.destroy();

    return sendSuccess(res, null, 'Post deleted and logged');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Suspend User ───────────────────────────────────────────────
exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, reason } = req.body;

    if (id === req.userId) return sendError(res, 'Cannot suspend yourself', 400);

    const user = await User.findByPk(id);
    if (!user) return sendError(res, 'User not found', 404);
    if (user.role === 'admin') return sendError(res, 'Cannot suspend an admin', 400);

    let suspendedUntil = null;
    if (duration === '1h') suspendedUntil = new Date(Date.now() + 1 * 60 * 60 * 1000);
    else if (duration === '24h') suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    else if (duration === '7d') suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    else if (duration === '30d') suspendedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    else if (duration === 'permanent') suspendedUntil = new Date('2099-12-31');

    await user.update({
      suspended: true,
      suspendedUntil,
      suspensionReason: reason || null,
    });

    await logAction('suspend_user', req.userId, {
      targetUserId: user.id,
      reason,
      meta: { duration, suspendedUntil: suspendedUntil?.toISOString(), fullName: user.fullName, username: user.username },
    });

    return sendSuccess(res, { user: user.toSafeObject() }, 'User suspended');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Unsuspend User ─────────────────────────────────────────────
exports.unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) return sendError(res, 'User not found', 404);

    await user.update({
      suspended: false,
      suspendedUntil: null,
      suspensionReason: null,
    });

    await logAction('unsuspend_user', req.userId, {
      targetUserId: user.id,
      meta: { fullName: user.fullName, username: user.username },
    });

    return sendSuccess(res, { user: user.toSafeObject() }, 'User unsuspended');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Hide Comment ───────────────────────────────────────────────
exports.hideComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const comment = await Comment.findByPk(id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'username'] }],
    });
    if (!comment) return sendError(res, 'Comment not found', 404);

    await comment.update({
      hidden: true,
      hiddenBy: req.userId,
      hiddenAt: new Date(),
      hiddenReason: reason || null,
    });

    await logAction('hide_comment', req.userId, {
      targetUserId: comment.userId,
      targetCommentId: comment.id,
      targetPostId: comment.postId,
      reason,
      meta: { commentContent: comment.content?.substring(0, 200), authorUsername: comment.author?.username },
    });

    return sendSuccess(res, null, 'Comment hidden');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Unhide Comment ─────────────────────────────────────────────
exports.unhideComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) return sendError(res, 'Comment not found', 404);

    await comment.update({
      hidden: false,
      hiddenBy: null,
      hiddenAt: null,
      hiddenReason: null,
    });

    return sendSuccess(res, null, 'Comment unhidden');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Delete Comment (moderated) ─────────────────────────────────
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const comment = await Comment.findByPk(id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'username'] }],
    });
    if (!comment) return sendError(res, 'Comment not found', 404);

    await logAction('delete_comment', req.userId, {
      targetUserId: comment.userId,
      targetCommentId: comment.id,
      targetPostId: comment.postId,
      reason,
      meta: { commentContent: comment.content?.substring(0, 200), authorUsername: comment.author?.username },
    });

    await Comment.destroy({ where: { parentCommentId: id } });
    await comment.destroy();
    await Post.decrement('commentsCount', { where: { id: comment.postId } });

    return sendSuccess(res, null, 'Comment deleted and logged');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Delete Event (moderated) ───────────────────────────────────
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const event = await CommunityEvent.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] }],
    });
    if (!event) return sendError(res, 'Event not found', 404);

    await logAction('delete_event', req.userId, {
      targetUserId: event.userId,
      targetEventId: event.id,
      reason,
      meta: { eventTitle: event.title },
    });

    await event.destroy();

    return sendSuccess(res, null, 'Event deleted and logged');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Get Moderation Logs ────────────────────────────────────────
exports.getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30, action = '' } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = {};
    if (action) where.action = action;

    const { count, rows } = await ModerationLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'admin', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: User, as: 'targetUser', attributes: ['id', 'fullName', 'username', 'profilePhoto'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Get Moderation Stats ───────────────────────────────────────
exports.getLogStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, last7d, last30d, suspendedUsers, hiddenComments] = await Promise.all([
      ModerationLog.count(),
      ModerationLog.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
      ModerationLog.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
      User.count({ where: { suspended: true } }),
      Comment.count({ where: { hidden: true } }),
    ]);

    const byAction = await ModerationLog.findAll({
      attributes: ['action', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      group: ['action'],
      raw: true,
    });

    return sendSuccess(res, {
      total, last7d, last30d, suspendedUsers, hiddenComments,
      byAction: byAction.reduce((acc, r) => { acc[r.action] = parseInt(r.count); return acc; }, {}),
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
