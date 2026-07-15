const { Op } = require('sequelize');
const {
  CommunityEvent, EventAttendee, EventComment, School, SchoolHistory, User, Memory, Like,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');

exports.getEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CommunityEvent.findByPk(eventId, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name', 'logo'] },
      ],
    });

    if (!event) return sendError(res, 'Event not found', 404);

    let isAttending = false;
    let isCreator = false;
    if (req.userId) {
      const attendee = await EventAttendee.findOne({ where: { userId: req.userId, eventId } });
      isAttending = !!attendee;
      isCreator = event.userId === req.userId;
    }

    return sendSuccess(res, {
      event: { ...event.toJSON(), isAttending, isCreator },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, eventDate, location, eventType } = req.body;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);
    if (event.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (eventDate !== undefined) updates.eventDate = eventDate;
    if (location !== undefined) updates.location = location;
    if (eventType !== undefined) updates.eventType = eventType;

    await event.update(updates);

    const full = await CommunityEvent.findByPk(eventId, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name', 'logo'] },
      ],
    });

    return sendSuccess(res, { event: full }, 'Event updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);
    if (event.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    await EventAttendee.destroy({ where: { eventId } });
    await EventComment.destroy({ where: { eventId } });
    await Memory.update({ eventId: null }, { where: { eventId } });
    await event.destroy();

    return sendSuccess(res, null, 'Event deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.uploadEventImages = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);

    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files uploaded', 400);
    }

    const uploads = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.path, 'memogram/events/images'))
    );

    const newImages = uploads.map((u) => u.url);
    const updatedImages = [...(event.images || []), ...newImages];
    await event.update({ images: updatedImages });

    return sendSuccess(res, { images: updatedImages }, 'Images uploaded');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.removeEventImage = async (req, res) => {
  try {
    const { eventId, index } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);
    if (event.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    const images = [...(event.images || [])];
    const idx = parseInt(index);
    if (idx < 0 || idx >= images.length) return sendError(res, 'Invalid image index', 400);

    images.splice(idx, 1);
    await event.update({ images });

    return sendSuccess(res, { images }, 'Image removed');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.uploadEventVideos = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);

    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files uploaded', 400);
    }

    const uploads = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.path, 'memogram/events/videos'))
    );

    const newVideos = uploads.map((u) => u.url);
    const updatedVideos = [...(event.videos || []), ...newVideos];
    await event.update({ videos: updatedVideos });

    return sendSuccess(res, { videos: updatedVideos }, 'Videos uploaded');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.removeEventVideo = async (req, res) => {
  try {
    const { eventId, index } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);
    if (event.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    const videos = [...(event.videos || [])];
    const idx = parseInt(index);
    if (idx < 0 || idx >= videos.length) return sendError(res, 'Invalid video index', 400);

    videos.splice(idx, 1);
    await event.update({ videos });

    return sendSuccess(res, { videos }, 'Video removed');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.toggleAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);

    const existing = await EventAttendee.findOne({
      where: { userId: req.userId, eventId },
    });

    if (existing) {
      await existing.destroy();
      await event.decrement('attendeesCount');
      return sendSuccess(res, { isAttending: false }, 'Removed from attendees');
    } else {
      await EventAttendee.create({ userId: req.userId, eventId });
      await event.increment('attendeesCount');
      return sendSuccess(res, { isAttending: true }, 'Added to attendees');
    }
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getAttendees = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: attendees } = await EventAttendee.findAndCountAll({
      where: { eventId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'fullName', 'username', 'profilePhoto', 'isOnline'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const users = attendees.map((a) => a.user.toJSON());
    const result = paginateResponse(users, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getComments = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: comments } = await EventComment.findAndCountAll({
      where: { eventId, parentCommentId: null },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(comments, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.createComment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content } = req.body;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);

    const comment = await EventComment.create({
      userId: req.userId,
      eventId,
      content,
    });

    await event.increment('commentsCount');

    const full = await EventComment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { comment: full }, 'Comment added', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { eventId, commentId } = req.params;

    const comment = await EventComment.findByPk(commentId);
    if (!comment || comment.eventId !== eventId) return sendError(res, 'Comment not found', 404);
    if (comment.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    const event = await CommunityEvent.findByPk(eventId);
    if (comment.parentCommentId) {
      const parent = await EventComment.findByPk(comment.parentCommentId);
      if (parent) await parent.decrement('repliesCount');
    }
    await EventComment.destroy({ where: { parentCommentId: commentId } });
    await comment.destroy();
    if (event) await event.decrement('commentsCount');

    return sendSuccess(res, null, 'Comment deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getReplies = async (req, res) => {
  try {
    const { eventId, commentId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const parent = await EventComment.findByPk(commentId);
    if (!parent || parent.eventId !== eventId) return sendError(res, 'Comment not found', 404);

    const { count, rows: replies } = await EventComment.findAndCountAll({
      where: { parentCommentId: commentId },
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
    const { eventId, commentId } = req.params;
    const { content } = req.body;

    const parent = await EventComment.findByPk(commentId);
    if (!parent || parent.eventId !== eventId) return sendError(res, 'Comment not found', 404);

    const reply = await EventComment.create({
      userId: req.userId,
      eventId,
      content,
      parentCommentId: commentId,
    });

    await parent.increment('repliesCount');

    const event = await CommunityEvent.findByPk(eventId);
    if (event) await event.increment('commentsCount');

    const full = await EventComment.findByPk(reply.id, {
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

    const reply = await EventComment.findByPk(replyId);
    if (!reply || !reply.parentCommentId) return sendError(res, 'Reply not found', 404);
    if (reply.userId !== req.userId) return sendError(res, 'Unauthorized', 403);

    const parent = await EventComment.findByPk(reply.parentCommentId);
    const event = await CommunityEvent.findByPk(reply.eventId);

    await reply.destroy();
    if (parent) await parent.decrement('repliesCount');
    if (event) await event.decrement('commentsCount');

    return sendSuccess(res, null, 'Reply deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getLinkedMemories = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);

    const { count, rows: memories } = await Memory.findAndCountAll({
      where: { eventId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
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

exports.linkMemory = async (req, res) => {
  try {
    const { eventId, memoryId } = req.params;

    const event = await CommunityEvent.findByPk(eventId);
    if (!event) return sendError(res, 'Event not found', 404);

    const memory = await Memory.findByPk(memoryId);
    if (!memory) return sendError(res, 'Memory not found', 404);
    if (memory.userId !== req.userId) return sendError(res, 'You can only link your own memories', 403);

    await memory.update({ eventId });

    return sendSuccess(res, { memory }, 'Memory linked to event');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.unlinkMemory = async (req, res) => {
  try {
    const { eventId, memoryId } = req.params;

    const memory = await Memory.findByPk(memoryId);
    if (!memory) return sendError(res, 'Memory not found', 404);
    if (memory.userId !== req.userId) return sendError(res, 'Unauthorized', 403);
    if (memory.eventId !== eventId) return sendError(res, 'Memory not linked to this event', 400);

    await memory.update({ eventId: null });

    return sendSuccess(res, null, 'Memory unlinked from event');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
