const { generateBadges } = require('../services/badgeService');
const { UserBadge } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');

exports.getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    const badges = await generateBadges(userId);

    // Persist for caching
    for (const badge of badges) {
      await UserBadge.findOrCreate({
        where: { userId, badgeId: badge.badgeId },
        defaults: { userId, ...badge },
      });
    }

    return sendSuccess(res, { badges, count: badges.length });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMyBadges = async (req, res) => {
  try {
    const badges = await generateBadges(req.userId);

    for (const badge of badges) {
      await UserBadge.findOrCreate({
        where: { userId: req.userId, badgeId: badge.badgeId },
        defaults: { userId: req.userId, ...badge },
      });
    }

    return sendSuccess(res, { badges, count: badges.length });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getAllUserBadges = async (userIds) => {
  const result = {};
  for (const userId of userIds) {
    try {
      result[userId] = await generateBadges(userId);
    } catch {
      result[userId] = [];
    }
  }
  return result;
};
