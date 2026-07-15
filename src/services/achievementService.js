const { UserAchievement, Post, Follow, SchoolHistory, ClubMember, MemoryStreak } = require('../models');
const ACHIEVEMENTS = require('./achievementDefinitions');

const getEarnedMap = async (userId) => {
  const earned = await UserAchievement.findAll({ where: { userId } });
  const map = {};
  earned.forEach((e) => { map[e.achievementId] = e; });
  return map;
};

const getProgress = async (userId, achievementId) => {
  switch (achievementId) {
    case 'first_post':
    case 'posts_10':
    case 'posts_50':
    case 'posts_100':
      return await Post.count({ where: { userId } });

    case 'first_memory':
    case 'memories_10':
    case 'memories_50':
    case 'memories_100':
      return await Post.count({ where: { userId, type: 'memory' } });

    case 'likes_10':
    case 'likes_100':
    case 'likes_500':
    case 'likes_1000': {
      const { sequelize } = require('../models');
      const result = await Post.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('likesCount')), 'total']],
        where: { userId },
        raw: true,
      });
      return parseInt(result?.total) || 0;
    }

    case 'followers_10':
    case 'followers_100':
    case 'followers_1000':
      return await Follow.count({ where: { followingId: userId } });

    case 'class_legend':
      return await SchoolHistory.count({ where: { userId } });

    case 'clubs_3':
    case 'clubs_5':
      return await ClubMember.count({ where: { userId } });

    case 'streak_7':
    case 'streak_30':
    case 'streak_365': {
      const streak = await MemoryStreak.findOne({ where: { userId } });
      return streak ? streak.currentStreak : 0;
    }

    default:
      return 0;
  }
};

const checkAndAward = async (userId, triggerIds) => {
  try {
    const earnedMap = await getEarnedMap(userId);
    const newAchievements = [];

    for (const def of ACHIEVEMENTS) {
      if (!triggerIds.includes(def.id)) continue;
      if (earnedMap[def.id]) continue;

      const progress = await getProgress(userId, def.id);
      if (progress > 0) {
        await UserAchievement.findOrCreate({
          where: { userId, achievementId: def.id },
          defaults: { userId, achievementId: def.id, progress },
        });
        newAchievements.push({ ...def, progress });
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Achievement check failed:', error.message);
    return [];
  }
};

const checkAll = async (userId) => {
  try {
    const earnedMap = await getEarnedMap(userId);
    const newAchievements = [];

    for (const def of ACHIEVEMENTS) {
      if (earnedMap[def.id]) continue;

      const progress = await getProgress(userId, def.id);
      if (progress > 0) {
        await UserAchievement.findOrCreate({
          where: { userId, achievementId: def.id },
          defaults: { userId, achievementId: def.id, progress },
        });
        newAchievements.push({ ...def, progress });
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Achievement full check failed:', error.message);
    return [];
  }
};

module.exports = { checkAndAward, checkAll, ACHIEVEMENTS };
