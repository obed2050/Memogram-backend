const { UserAchievement } = require('../models');
const { checkAll, ACHIEVEMENTS } = require('../services/achievementService');
const { sendSuccess, sendError } = require('../utils/response');

exports.getMyAchievements = async (req, res) => {
  try {
    const earned = await UserAchievement.findAll({
      where: { userId: req.userId },
      order: [['earnedAt', 'DESC']],
    });

    const all = ACHIEVEMENTS.map((def) => {
      const record = earned.find((e) => e.achievementId === def.id);
      return {
        ...def,
        earned: !!record,
        earnedAt: record?.earnedAt || null,
        progress: record?.progress || 0,
      };
    });

    const categories = {};
    all.forEach((a) => {
      if (!categories[a.category]) categories[a.category] = [];
      categories[a.category].push(a);
    });

    return sendSuccess(res, {
      achievements: all,
      categories,
      totalEarned: earned.length,
      totalAvailable: ACHIEVEMENTS.length,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.params;
    const earned = await UserAchievement.findAll({
      where: { userId },
      order: [['earnedAt', 'DESC']],
    });

    const all = ACHIEVEMENTS.map((def) => {
      const record = earned.find((e) => e.achievementId === def.id);
      return {
        ...def,
        earned: !!record,
        earnedAt: record?.earnedAt || null,
        progress: record?.progress || 0,
      };
    });

    const categories = {};
    all.forEach((a) => {
      if (!categories[a.category]) categories[a.category] = [];
      categories[a.category].push(a);
    });

    return sendSuccess(res, {
      achievements: all,
      categories,
      totalEarned: earned.length,
      totalAvailable: ACHIEVEMENTS.length,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.recheckAchievements = async (req, res) => {
  try {
    const newAchievements = await checkAll(req.userId);
    return sendSuccess(res, { newAchievements, count: newAchievements.length });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
