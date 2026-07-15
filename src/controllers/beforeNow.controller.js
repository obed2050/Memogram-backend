const { Op } = require('sequelize');
const { BeforeNow, BeforeNowLike, BeforeNowComment, User, School, Follow } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');

exports.createBeforeNow = async (req, res) => {
  try {
    const { title, beforeCaption, afterCaption, beforeYear, afterYear, schoolId, generation } = req.body;

    if (!req.files || req.files.length < 2) {
      return sendError(res, 'Both before and after images are required', 400);
    }

    const beforeResult = await uploadToCloudinary(req.files[0].path, 'memogram/before-now');
    const afterResult = await uploadToCloudinary(req.files[1].path, 'memogram/before-now');

    const comparison = await BeforeNow.create({
      userId: req.userId,
      title: title || null,
      beforeImage: beforeResult.url,
      afterImage: afterResult.url,
      beforeCaption: beforeCaption || null,
      afterCaption: afterCaption || null,
      beforeYear: beforeYear || null,
      afterYear: afterYear || null,
      schoolId: schoolId || null,
      generation: generation || null,
    });

    const full = await BeforeNow.findByPk(comparison.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
    });

    return sendSuccess(res, { beforeNow: full }, 'Comparison created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
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
    };

    const { count, rows } = await BeforeNow.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const items = await Promise.all(
      rows.map(async (item) => {
        const liked = await BeforeNowLike.findOne({ where: { userId: req.userId, beforeNowId: item.id } });
        const data = item.toJSON();
        data.isLiked = !!liked;
        return data;
      })
    );

    const result = paginateResponse(items, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getExplore = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await BeforeNow.findAndCountAll({
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const items = await Promise.all(
      rows.map(async (item) => {
        const liked = await BeforeNowLike.findOne({ where: { userId: req.userId, beforeNowId: item.id } });
        const data = item.toJSON();
        data.isLiked = !!liked;
        return data;
      })
    );

    const result = paginateResponse(items, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getBeforeNow = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await BeforeNow.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!item) {
      return sendError(res, 'Comparison not found', 404);
    }

    const data = item.toJSON();
    if (req.userId) {
      const liked = await BeforeNowLike.findOne({ where: { userId: req.userId, beforeNowId: id } });
      data.isLiked = !!liked;
    }

    return sendSuccess(res, { beforeNow: data });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteBeforeNow = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await BeforeNow.findByPk(id);
    if (!item) {
      return sendError(res, 'Comparison not found', 404);
    }

    if (item.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    await BeforeNowComment.destroy({ where: { beforeNowId: id } });
    await BeforeNowLike.destroy({ where: { beforeNowId: id } });
    await item.destroy();

    return sendSuccess(res, null, 'Comparison deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await BeforeNow.findByPk(id);
    if (!item) {
      return sendError(res, 'Comparison not found', 404);
    }

    const existing = await BeforeNowLike.findOne({ where: { userId: req.userId, beforeNowId: id } });

    if (existing) {
      await existing.destroy();
      await item.decrement('likesCount');
      return sendSuccess(res, { isLiked: false, likesCount: item.likesCount - 1 });
    } else {
      await BeforeNowLike.create({ userId: req.userId, beforeNowId: id });
      await item.increment('likesCount');
      return sendSuccess(res, { isLiked: true, likesCount: item.likesCount + 1 });
    }
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await BeforeNowLike.findAndCountAll({
      where: { beforeNowId: id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const users = rows.map((r) => r.user);
    const result = paginateResponse(users, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await BeforeNowComment.findAndCountAll({
      where: { beforeNowId: id, parentCommentId: null },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const item = await BeforeNow.findByPk(id);
    if (!item) {
      return sendError(res, 'Comparison not found', 404);
    }

    const comment = await BeforeNowComment.create({
      userId: req.userId,
      beforeNowId: id,
      content,
    });

    await item.increment('commentsCount');

    const full = await BeforeNowComment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { comment: full }, 'Comment posted', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const comment = await BeforeNowComment.findByPk(commentId);
    if (!comment) {
      return sendError(res, 'Comment not found', 404);
    }

    if (comment.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    const item = await BeforeNow.findByPk(id);
    if (item) {
      await item.decrement('commentsCount');
    }

    await BeforeNowComment.destroy({ where: { parentCommentId: commentId } });
    await comment.destroy();

    return sendSuccess(res, null, 'Comment deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getReplies = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await BeforeNowComment.findAndCountAll({
      where: { beforeNowId: id, parentCommentId: commentId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'ASC']],
      limit: queryLimit,
      offset,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createReply = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;

    const parent = await BeforeNowComment.findByPk(commentId);
    if (!parent) {
      return sendError(res, 'Comment not found', 404);
    }

    const reply = await BeforeNowComment.create({
      userId: req.userId,
      beforeNowId: id,
      content,
      parentCommentId: commentId,
    });

    await parent.increment('repliesCount');

    const item = await BeforeNow.findByPk(id);
    if (item) {
      await item.increment('commentsCount');
    }

    const full = await BeforeNowComment.findByPk(reply.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { reply: full }, 'Reply posted', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteReply = async (req, res) => {
  try {
    const { replyId } = req.params;

    const reply = await BeforeNowComment.findByPk(replyId);
    if (!reply) {
      return sendError(res, 'Reply not found', 404);
    }

    if (reply.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    const parent = await BeforeNowComment.findByPk(reply.parentCommentId);
    if (parent) {
      await parent.decrement('repliesCount');
    }

    const item = await BeforeNow.findByPk(reply.beforeNowId);
    if (item) {
      await item.decrement('commentsCount');
    }

    await reply.destroy();

    return sendSuccess(res, null, 'Reply deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getUserBeforeNows = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await BeforeNow.findAndCountAll({
      where: { userId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const items = await Promise.all(
      rows.map(async (item) => {
        const liked = await BeforeNowLike.findOne({ where: { userId: req.userId, beforeNowId: item.id } });
        const data = item.toJSON();
        data.isLiked = !!liked;
        return data;
      })
    );

    const result = paginateResponse(items, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
