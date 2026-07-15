const { Comment, User, Post } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { generateBadges } = require('../services/badgeService');
const { trackInteraction } = require('../services/recommendationEngine');
const { trackPostEngagement } = require('../services/redis.service');
const { invalidatePattern } = require('../middlewares/cache');

const enrichAuthorsWithBadges = async (comments) => {
  const authorIds = new Set();
  comments.forEach((c) => {
    if (c.author?.id) authorIds.add(c.author.id);
    (c.replies || []).forEach((r) => {
      if (r.author?.id) authorIds.add(r.author.id);
    });
  });

  const badgeMap = {};
  for (const id of authorIds) {
    try { badgeMap[id] = await generateBadges(id); } catch { badgeMap[id] = []; }
  }

  comments.forEach((c) => {
    if (c.author?.id) c.author.badges = badgeMap[c.author.id] || [];
    (c.replies || []).forEach((r) => {
      if (r.author?.id) r.author.badges = badgeMap[r.author.id] || [];
    });
  });

  return comments;
};

exports.createComment = async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    const post = await Post.findByPk(postId);
    if (!post) {
      return sendError(res, 'Post not found', 404);
    }

    if (parentCommentId) {
      const parentComment = await Comment.findByPk(parentCommentId);
      if (!parentComment) {
        return sendError(res, 'Parent comment not found', 404);
      }
    }

    const comment = await Comment.create({
      userId: req.userId,
      postId,
      content,
      parentCommentId: parentCommentId || null,
    });

    await Post.increment('commentsCount', { where: { id: postId } });
    trackInteraction(req.userId, postId, 'comment').catch(() => {});
    trackPostEngagement(postId, post?.type, 3).catch(() => {});

    const fullComment = await Comment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    const commentData = fullComment.toJSON();
    if (commentData.author?.id) {
      commentData.author.badges = await generateBadges(commentData.author.id);
    }

    return sendSuccess(res, { comment: commentData }, 'Comment created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: comments } = await Comment.findAndCountAll({
      where: { postId, parentCommentId: null, hidden: false },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        {
          model: Comment,
          as: 'replies',
          where: { hidden: false },
          required: false,
          include: [
            { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
          ],
          order: [['createdAt', 'ASC']],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(comments, count, parseInt(page), queryLimit);

    if (result.data && result.data.length > 0) {
      result.data = await enrichAuthorsWithBadges(result.data);
    }

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return sendError(res, 'Comment not found', 404);
    }

    if (comment.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    const postId = comment.postId;
    await comment.destroy();
    await Post.decrement('commentsCount', { where: { id: postId } });

    return sendSuccess(res, null, 'Comment deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
