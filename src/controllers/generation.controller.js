const { Op, fn, col, literal } = require('sequelize');
const {
  GenerationDiscussion, GenerationDiscussionReply, School, SchoolHistory, User, Post, Memory, Like,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');

exports.getMyGenerations = async (req, res) => {
  try {
    const histories = await SchoolHistory.findAll({
      where: { userId: req.userId, generation: { [Op.not]: null } },
      include: [{ model: School, as: 'school', attributes: ['id', 'name', 'location', 'logo'] }],
      order: [['createdAt', 'DESC']],
    });

    const generationMap = {};
    for (const h of histories) {
      const key = `${h.schoolId}::${h.generation}`;
      if (!generationMap[key]) {
        generationMap[key] = {
          schoolId: h.schoolId,
          schoolName: h.school.name,
          schoolLocation: h.school.location,
          schoolLogo: h.school.logo,
          generation: h.generation,
          memberCount: 0,
        };
      }
    }

    const generations = Object.values(generationMap);

    for (const gen of generations) {
      gen.memberCount = await SchoolHistory.count({
        where: { schoolId: gen.schoolId, generation: gen.generation },
      });
    }

    return sendSuccess(res, { generations });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getGeneration = async (req, res) => {
  try {
    const { schoolId, generation } = req.params;
    const decodedGeneration = decodeURIComponent(generation);

    const school = await School.findByPk(schoolId);
    if (!school) return sendError(res, 'School not found', 404);

    const memberCount = await SchoolHistory.count({
      where: { schoolId, generation: decodedGeneration },
    });

    if (memberCount === 0) return sendError(res, 'Generation not found', 404);

    const postCount = await Post.count({
      where: { schoolId, generation: decodedGeneration },
    });

    const memoryCount = await Memory.count({
      where: { schoolId, generation: decodedGeneration },
    });

    let isMember = false;
    if (req.userId) {
      const membership = await SchoolHistory.findOne({
        where: { userId: req.userId, schoolId, generation: decodedGeneration },
      });
      isMember = !!membership;
    }

    return sendSuccess(res, {
      generation: {
        schoolId,
        schoolName: school.name,
        schoolLocation: school.location,
        schoolLogo: school.logo,
        generation: decodedGeneration,
        memberCount,
        postCount,
        memoryCount,
        isMember,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getGenerationMembers = async (req, res) => {
  try {
    const { schoolId, generation } = req.params;
    const decodedGeneration = decodeURIComponent(generation);
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: members } = await SchoolHistory.findAndCountAll({
      where: { schoolId, generation: decodedGeneration },
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const users = members.map((m) => ({
      ...m.user.toJSON(),
      department: m.department,
      className: m.className,
      isCurrent: m.isCurrent,
      startDate: m.startDate,
      endDate: m.endDate,
    }));

    const result = paginateResponse(users, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getGenerationPosts = async (req, res) => {
  try {
    const { schoolId, generation } = req.params;
    const decodedGeneration = decodeURIComponent(generation);
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { schoolId, generation: decodedGeneration },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const postsWithLike = await Promise.all(
      posts.map(async (post) => {
        const liked = req.userId
          ? await Like.findOne({ where: { userId: req.userId, postId: post.id } })
          : null;
        const data = post.toJSON();
        data.isLiked = !!liked;
        return data;
      })
    );

    const result = paginateResponse(postsWithLike, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getGenerationMemories = async (req, res) => {
  try {
    const { schoolId, generation } = req.params;
    const decodedGeneration = decodeURIComponent(generation);
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: memories } = await Memory.findAndCountAll({
      where: { schoolId, generation: decodedGeneration },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(memories, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getDiscussions = async (req, res) => {
  try {
    const { schoolId, generation } = req.params;
    const decodedGeneration = decodeURIComponent(generation);
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: discussions } = await GenerationDiscussion.findAndCountAll({
      where: { schoolId, generation: decodedGeneration },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(discussions, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createDiscussion = async (req, res) => {
  try {
    const { schoolId, generation } = req.params;
    const decodedGeneration = decodeURIComponent(generation);
    const { title, content } = req.body;

    const membership = await SchoolHistory.findOne({
      where: { userId: req.userId, schoolId, generation: decodedGeneration },
    });
    if (!membership) {
      return sendError(res, 'You must be a member of this generation to create discussions', 403);
    }

    const discussion = await GenerationDiscussion.create({
      userId: req.userId,
      schoolId,
      generation: decodedGeneration,
      title,
      content,
    });

    const full = await GenerationDiscussion.findByPk(discussion.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { discussion: full }, 'Discussion created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await GenerationDiscussion.findByPk(discussionId, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    if (!discussion) return sendError(res, 'Discussion not found', 404);

    return sendSuccess(res, { discussion });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await GenerationDiscussion.findByPk(discussionId);
    if (!discussion) return sendError(res, 'Discussion not found', 404);
    if (discussion.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    await GenerationDiscussionReply.destroy({ where: { discussionId } });
    await discussion.destroy();

    return sendSuccess(res, null, 'Discussion deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getReplies = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const discussion = await GenerationDiscussion.findByPk(discussionId);
    if (!discussion) return sendError(res, 'Discussion not found', 404);

    const { count, rows: replies } = await GenerationDiscussionReply.findAndCountAll({
      where: { discussionId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'ASC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(replies, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createReply = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content } = req.body;

    const discussion = await GenerationDiscussion.findByPk(discussionId);
    if (!discussion) return sendError(res, 'Discussion not found', 404);

    const reply = await GenerationDiscussionReply.create({
      userId: req.userId,
      discussionId,
      content,
    });

    await discussion.increment('repliesCount');

    const full = await GenerationDiscussionReply.findByPk(reply.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { reply: full }, 'Reply added', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteReply = async (req, res) => {
  try {
    const { replyId } = req.params;

    const reply = await GenerationDiscussionReply.findByPk(replyId);
    if (!reply) return sendError(res, 'Reply not found', 404);
    if (reply.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    await reply.destroy();

    await GenerationDiscussion.decrement('repliesCount', { where: { id: reply.discussionId } });

    return sendSuccess(res, null, 'Reply deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
