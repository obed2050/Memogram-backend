const { Op } = require('sequelize');
const {
  Community, CommunityEvent, School, SchoolHistory, User, Post, Memory, Like, sequelize,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');

exports.getMyCommunities = async (req, res) => {
  try {
    const userInstance = await User.findByPk(req.userId);
    const userSchools = userInstance ? await userInstance.getSchools({
      include: [
        {
          model: Community,
          as: 'community',
          required: false,
        },
      ],
    }) : [];

    const communities = userSchools.map((school) => {
      const plain = school.toJSON();
      return {
        id: plain.community?.id || null,
        schoolId: plain.id,
        schoolName: plain.name,
        schoolLocation: plain.location,
        schoolLogo: plain.logo,
        description: plain.community?.description || null,
        banner: plain.community?.banner || null,
        memberCount: plain.community?.memberCount || 0,
        hasCommunity: !!plain.community,
      };
    });

    return sendSuccess(res, { communities });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getCommunityBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findByPk(schoolId);
    if (!school) {
      return sendError(res, 'School not found', 404);
    }

    let community = await Community.findOne({
      where: { schoolId },
    });

    if (!community) {
      community = await Community.create({ schoolId, memberCount: 0 });
    }

    const memberCount = await SchoolHistory.count({ where: { schoolId } });

    let isMember = false;
    if (req.userId) {
      const membership = await SchoolHistory.findOne({
        where: { userId: req.userId, schoolId },
      });
      isMember = !!membership;
    }

    const upcomingEvents = await CommunityEvent.count({
      where: {
        schoolId,
        eventDate: { [Op.gte]: new Date() },
      },
    });

    return sendSuccess(res, {
      community: {
        ...community.toJSON(),
        schoolName: school.name,
        schoolLocation: school.location,
        schoolLogo: school.logo,
        memberCount,
        isMember,
        upcomingEvents,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateCommunity = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { description, rules } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
      return sendError(res, 'School not found', 404);
    }

    let community = await Community.findOne({ where: { schoolId } });
    if (!community) {
      community = await Community.create({ schoolId });
    }

    const updates = {};
    if (description !== undefined) updates.description = description;
    if (rules !== undefined) updates.rules = rules;

    await community.update(updates);

    return sendSuccess(res, { community }, 'Community updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.uploadCommunityBanner = async (req, res) => {
  try {
    const { schoolId } = req.params;

    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    let community = await Community.findOne({ where: { schoolId } });
    if (!community) {
      community = await Community.create({ schoolId });
    }

    const result = await uploadToCloudinary(req.file.path, 'memogram/communities');
    await community.update({ banner: result.url });

    return sendSuccess(res, { banner: result.url }, 'Banner updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getCommunityMembers = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: members } = await SchoolHistory.findAndCountAll({
      where: { schoolId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const users = members.map((m) => ({
      ...m.user.toJSON(),
      generation: m.generation,
      department: m.department,
      className: m.className,
      isCurrent: m.isCurrent,
    }));

    const result = paginateResponse(users, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getCommunityPosts = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { schoolId },
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

exports.getCommunityMemories = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: memories } = await Memory.findAndCountAll({
      where: { schoolId },
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

exports.getCommunityEvents = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 20, past } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = { schoolId };
    if (past !== 'true') {
      where.eventDate = { [Op.gte]: new Date() };
    }

    const { count, rows: events } = await CommunityEvent.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['eventDate', past === 'true' ? 'DESC' : 'ASC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(events, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createCommunityEvent = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { title, description, eventDate, location } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) {
      return sendError(res, 'School not found', 404);
    }

    const membership = await SchoolHistory.findOne({
      where: { userId: req.userId, schoolId },
    });
    if (!membership) {
      return sendError(res, 'You must be a member of this community to create events', 403);
    }

    let coverImage = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'memogram/events');
      coverImage = result.url;
    }

    const event = await CommunityEvent.create({
      schoolId,
      userId: req.userId,
      title,
      description,
      eventDate,
      location,
      coverImage,
    });

    const fullEvent = await CommunityEvent.findByPk(event.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { event: fullEvent }, 'Event created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteCommunityEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) {
      return sendError(res, 'Event not found', 404);
    }

    if (event.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    await event.destroy();
    return sendSuccess(res, null, 'Event deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.browseCommunities = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = {};
    if (q) {
      where.name = { [Op.iLike]: `%${q}%` };
    }

    const { count, rows: schools } = await School.findAndCountAll({
      where,
      include: [
        {
          model: Community,
          as: 'community',
          required: false,
        },
      ],
      order: [['name', 'ASC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const communities = await Promise.all(
      schools.map(async (school) => {
        const plain = school.toJSON();
        const memberCount = await SchoolHistory.count({ where: { schoolId: school.id } });
        let isMember = false;
        if (req.userId) {
          const m = await SchoolHistory.findOne({ where: { userId: req.userId, schoolId: school.id } });
          isMember = !!m;
        }
        return {
          id: plain.community?.id || null,
          schoolId: plain.id,
          schoolName: plain.name,
          schoolLocation: plain.location,
          schoolLogo: plain.logo,
          description: plain.community?.description || null,
          banner: plain.community?.banner || null,
          memberCount,
          hasCommunity: !!plain.community,
          isMember,
        };
      })
    );

    const result = paginateResponse(communities, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
