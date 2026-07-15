const { Op } = require('sequelize');
const { Call, User, Conversation } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');

exports.getCallHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: calls } = await Call.findAndCountAll({
      where: {
        [Op.or]: [
          { callerId: req.userId },
          { receiverId: req.userId },
        ],
      },
      include: [
        { model: User, as: 'caller', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: User, as: 'receiver', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: Conversation, as: 'conversation', attributes: ['id'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    return sendSuccess(res, paginateResponse(calls, count, parseInt(page), queryLimit));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMissedCalls = async (req, res) => {
  try {
    const calls = await Call.findAll({
      where: {
        receiverId: req.userId,
        status: 'missed',
      },
      include: [
        { model: User, as: 'caller', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return sendSuccess(res, { calls });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
