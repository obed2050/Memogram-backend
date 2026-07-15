const { Op } = require('sequelize');
const {
  Club, ClubMember, School, SchoolHistory, User, Post, CommunityEvent, Like, sequelize,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');
const { checkAndAward } = require('../services/achievementService');

exports.getMyClubs = async (req, res) => {
  try {
    const memberships = await ClubMember.findAll({
      where: { userId: req.userId },
      include: [
        {
          model: Club,
          as: 'club',
          include: [
            { model: School, as: 'school', attributes: ['id', 'name', 'logo'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const clubs = memberships.map((m) => ({
      ...m.club.toJSON(),
      role: m.role,
      joinedAt: m.createdAt,
    }));

    return sendSuccess(res, { clubs });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getClub = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findByPk(clubId, {
      include: [
        { model: School, as: 'school', attributes: ['id', 'name', 'logo', 'location'] },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] },
      ],
    });

    if (!club) return sendError(res, 'Club not found', 404);

    let isMember = false;
    let memberRole = null;
    if (req.userId) {
      const membership = await ClubMember.findOne({
        where: { userId: req.userId, clubId },
      });
      isMember = !!membership;
      memberRole = membership?.role || null;
    }

    const memberCount = await ClubMember.count({ where: { clubId } });

    return sendSuccess(res, {
      club: {
        ...club.toJSON(),
        memberCount,
        isMember,
        memberRole,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createClub = async (req, res) => {
  try {
    const { name, description, schoolId } = req.body;

    const school = await School.findByPk(schoolId);
    if (!school) return sendError(res, 'School not found', 404);

    const membership = await SchoolHistory.findOne({
      where: { userId: req.userId, schoolId },
    });
    if (!membership) {
      return sendError(res, 'You must be a member of this school to create clubs', 403);
    }

    let logo = null;
    let coverImage = null;
    if (req.files) {
      const logoFile = req.files.find((f) => f.fieldname === 'logo');
      const coverFile = req.files.find((f) => f.fieldname === 'coverImage');
      if (logoFile) {
        const result = await uploadToCloudinary(logoFile.path, 'memogram/clubs');
        logo = result.url;
      }
      if (coverFile) {
        const result = await uploadToCloudinary(coverFile.path, 'memogram/clubs');
        coverImage = result.url;
      }
    }

    const club = await Club.create({
      name,
      description,
      schoolId,
      logo,
      coverImage,
      createdBy: req.userId,
      memberCount: 1,
    });

    await ClubMember.create({
      userId: req.userId,
      clubId: club.id,
      role: 'owner',
    });

    await checkAndAward(req.userId, ['clubs_3', 'clubs_5']);

    const full = await Club.findByPk(club.id, {
      include: [
        { model: School, as: 'school', attributes: ['id', 'name', 'logo'] },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] },
      ],
    });

    return sendSuccess(res, { club: full }, 'Club created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateClub = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { name, description } = req.body;

    const club = await Club.findByPk(clubId);
    if (!club) return sendError(res, 'Club not found', 404);

    const membership = await ClubMember.findOne({
      where: { userId: req.userId, clubId },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return sendError(res, 'Unauthorized', 403);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    if (req.files) {
      const logoFile = req.files.find((f) => f.fieldname === 'logo');
      const coverFile = req.files.find((f) => f.fieldname === 'coverImage');
      if (logoFile) {
        const result = await uploadToCloudinary(logoFile.path, 'memogram/clubs');
        updates.logo = result.url;
      }
      if (coverFile) {
        const result = await uploadToCloudinary(coverFile.path, 'memogram/clubs');
        updates.coverImage = result.url;
      }
    }

    await club.update(updates);

    const full = await Club.findByPk(clubId, {
      include: [
        { model: School, as: 'school', attributes: ['id', 'name', 'logo'] },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] },
      ],
    });

    return sendSuccess(res, { club: full }, 'Club updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteClub = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findByPk(clubId);
    if (!club) return sendError(res, 'Club not found', 404);
    if (club.createdBy !== req.userId) return sendError(res, 'Only the creator can delete this club', 403);

    await ClubMember.destroy({ where: { clubId } });
    await Post.update({ clubId: null }, { where: { clubId } });
    await CommunityEvent.update({ clubId: null }, { where: { clubId } });
    await club.destroy();

    return sendSuccess(res, null, 'Club deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.toggleMembership = async (req, res) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findByPk(clubId);
    if (!club) return sendError(res, 'Club not found', 404);

    const existing = await ClubMember.findOne({
      where: { userId: req.userId, clubId },
    });

    if (existing) {
      if (existing.role === 'owner') {
        return sendError(res, 'Owner cannot leave the club. Transfer ownership first.', 400);
      }
      await existing.destroy();
      await club.decrement('memberCount');
      return sendSuccess(res, { isMember: false, role: null }, 'Left the club');
    } else {
      await ClubMember.create({ userId: req.userId, clubId, role: 'member' });
      await club.increment('memberCount');
      await checkAndAward(req.userId, ['clubs_3', 'clubs_5']);
      return sendSuccess(res, { isMember: true, role: 'member' }, 'Joined the club');
    }
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMembers = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: members } = await ClubMember.findAndCountAll({
      where: { clubId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline'] },
      ],
      order: [
        ['role', 'ASC'],
        ['createdAt', 'DESC'],
      ],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const users = members.map((m) => ({
      ...m.user.toJSON(),
      role: m.role,
      joinedAt: m.createdAt,
    }));

    const result = paginateResponse(users, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getFeed = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { clubId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
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

exports.getPhotos = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: {
        clubId,
        images: { [Op.and]: [sequelize.literal('"images"::text != \'[]\'')] },
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(posts, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getVideos = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: {
        clubId,
        videos: { [Op.and]: [sequelize.literal('"videos"::text != \'[]\'')] },
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(posts, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { page = 1, limit = 20, past } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = { clubId };
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

exports.createEvent = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { title, description, eventDate, location, eventType } = req.body;

    const club = await Club.findByPk(clubId);
    if (!club) return sendError(res, 'Club not found', 404);

    const membership = await ClubMember.findOne({
      where: { userId: req.userId, clubId },
    });
    if (!membership) {
      return sendError(res, 'You must be a member to create events', 403);
    }

    let coverImage = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'memogram/events');
      coverImage = result.url;
    }

    const event = await CommunityEvent.create({
      schoolId: club.schoolId,
      clubId,
      userId: req.userId,
      title,
      description,
      eventDate,
      location,
      eventType: eventType || 'other',
      coverImage,
    });

    const full = await CommunityEvent.findByPk(event.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { event: full }, 'Event created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.browseClubs = async (req, res) => {
  try {
    const { q, schoolId, page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = {};
    if (q) where.name = { [Op.iLike]: `%${q}%` };
    if (schoolId) where.schoolId = schoolId;

    const { count, rows: clubs } = await Club.findAndCountAll({
      where,
      include: [
        { model: School, as: 'school', attributes: ['id', 'name', 'logo'] },
      ],
      order: [['memberCount', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const enriched = await Promise.all(
      clubs.map(async (club) => {
        let isMember = false;
        if (req.userId) {
          const m = await ClubMember.findOne({ where: { userId: req.userId, clubId: club.id } });
          isMember = !!m;
        }
        return { ...club.toJSON(), isMember };
      })
    );

    const result = paginateResponse(enriched, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
