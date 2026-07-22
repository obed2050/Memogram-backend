const { MemoryStreak, STREAK_BADGE_THRESHOLDS } = require('../models/MemoryStreak');
const { sendSuccess, sendError } = require('../utils/response');

const isYesterday = (dateStr) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split('T')[0];
};

const isToday = (dateStr) => {
  return dateStr === new Date().toISOString().split('T')[0];
};

const updateStreak = async (userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [streak, created] = await MemoryStreak.findOrCreate({
      where: { userId },
      defaults: { userId, lastMemoryDate: today },
    });

    if (!created && isToday(streak.lastMemoryDate)) {
      streak.totalMemoriesPosted += 1;
      await streak.save();
      return streak.toJSON();
    }

    if (!created && isYesterday(streak.lastMemoryDate)) {
      streak.currentStreak += 1;
    } else if (!created) {
      streak.currentStreak = 1;
    }

    streak.lastMemoryDate = today;
    streak.totalMemoriesPosted += 1;

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    const earnedNames = new Set((streak.streakBadges || []).map((b) => b.name));
    const newBadges = [];
    for (const badge of STREAK_BADGE_THRESHOLDS) {
      if (streak.currentStreak >= badge.threshold && !earnedNames.has(badge.name)) {
        const entry = { ...badge, earnedAt: new Date().toISOString() };
        newBadges.push(entry);
      }
    }
    if (newBadges.length > 0) {
      streak.streakBadges = [...(streak.streakBadges || []), ...newBadges];
    }

    await streak.save();
    return streak.toJSON();
  } catch (error) {
    console.error('Streak update failed:', error.message);
    return null;
  }
};

exports.getMyStreak = async (req, res) => {
  try {
    let streak = await MemoryStreak.findOne({ where: { userId: req.userId } });
    if (!streak) {
      streak = await MemoryStreak.create({ userId: req.userId });
    }
    return sendSuccess(res, { streak: streak.toJSON() });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getUserStreak = async (req, res) => {
  try {
    const { userId } = req.params;
    let streak = await MemoryStreak.findOne({ where: { userId } });
    if (!streak) {
      streak = await MemoryStreak.create({ userId });
    }
    return sendSuccess(res, { streak: streak.toJSON() });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const streaks = await MemoryStreak.findAll({
      order: [['currentStreak', 'DESC']],
      limit: parseInt(limit),
    });
    return sendSuccess(res, { streaks: streaks.map((s) => s.toJSON()) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateStreak = updateStreak;
