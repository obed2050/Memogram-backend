const { Op } = require('sequelize');
const { Draft, Post, User, School } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');
const { updateStreak } = require('../controllers/streak.controller');
const { checkAndAward } = require('../services/achievementService');

// POST /api/drafts — create a draft (with optional media upload)
exports.createDraft = async (req, res) => {
  try {
    const { type, content, schoolId, generation, clubId, visibility } = req.body;

    let imageUrls = [];
    let videoUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'memogram/drafts');
        if (file.mimetype.startsWith('video/')) {
          videoUrls.push(result.url);
        } else {
          imageUrls.push(result.url);
        }
      }
    }

    const draft = await Draft.create({
      userId: req.userId,
      type: type || 'post',
      content: content || null,
      images: imageUrls,
      videos: videoUrls,
      schoolId: schoolId || null,
      generation: generation || null,
      clubId: clubId || null,
      visibility: visibility || 'public',
    });

    return sendSuccess(res, { draft }, 'Draft saved', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/drafts — list drafts (type filter + pagination)
exports.getDrafts = async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = { userId: req.userId };
    if (type !== 'all') {
      const validTypes = ['post', 'reel', 'memory'];
      if (!validTypes.includes(type)) {
        return sendError(res, 'Invalid type', 400);
      }
      where.type = type;
    }

    const { count, rows } = await Draft.findAndCountAll({
      where,
      order: [['updatedAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/drafts/:id — get single draft
exports.getDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return sendError(res, 'Draft not found', 404);
    if (draft.userId !== req.userId) return sendError(res, 'Unauthorized', 403);
    return sendSuccess(res, { draft });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// PUT /api/drafts/:id — update a draft (with optional new media)
exports.updateDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return sendError(res, 'Draft not found', 404);
    if (draft.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    const { type, content, schoolId, generation, clubId, visibility } = req.body;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'memogram/drafts');
        if (file.mimetype.startsWith('video/')) {
          draft.videos = [...draft.videos, result.url];
        } else {
          draft.images = [...draft.images, result.url];
        }
      }
    }

    if (type !== undefined) draft.type = type;
    if (content !== undefined) draft.content = content;
    if (schoolId !== undefined) draft.schoolId = schoolId;
    if (generation !== undefined) draft.generation = generation;
    if (clubId !== undefined) draft.clubId = clubId;
    if (visibility !== undefined) draft.visibility = visibility;

    await draft.save();
    return sendSuccess(res, { draft }, 'Draft updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// DELETE /api/drafts/:id — delete a draft
exports.deleteDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return sendError(res, 'Draft not found', 404);
    if (draft.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    await draft.destroy();
    return sendSuccess(res, null, 'Draft deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// POST /api/drafts/:id/publish — publish a draft as a post, then delete it
exports.publishDraft = async (req, res) => {
  try {
    const draft = await Draft.findByPk(req.params.id);
    if (!draft) return sendError(res, 'Draft not found', 404);
    if (draft.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    const postType = draft.type === 'reel' ? 'reel' : draft.type === 'memory' ? 'memory' : 'post';

    const post = await Post.create({
      userId: req.userId,
      content: draft.content,
      images: draft.images,
      videos: draft.videos,
      type: postType,
      visibility: draft.visibility,
      schoolId: draft.schoolId,
      generation: draft.generation,
      clubId: draft.clubId,
    });

    await draft.destroy();

    let streakData = null;
    if (postType === 'memory') {
      streakData = await updateStreak(req.userId);
    }

    const triggerIds = ['first_post'];
    if (postType === 'memory') triggerIds.push('first_memory');
    const newAchievements = await checkAndAward(req.userId, triggerIds);

    const fullPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
    });

    return sendSuccess(res, { post: fullPost, streak: streakData, newAchievements }, 'Draft published', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
