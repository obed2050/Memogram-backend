const { Notification, User } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { getUnreadNotificationCount, clearNotificationCount } = require('../services/redis.service');

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: { userId: req.userId },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(notifications, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.update({ isRead: true }, { where: { id, userId: req.userId } });
    return sendSuccess(res, null, 'Notification marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.userId, isRead: false } });
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const redisCount = await getUnreadNotificationCount(req.userId);
    const dbCount = await Notification.count({
      where: { userId: req.userId, isRead: false },
    });
    const count = Math.max(redisCount, dbCount);
    return sendSuccess(res, { count });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.userId, isRead: false } });
    await clearNotificationCount(req.userId);
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
