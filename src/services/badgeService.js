const {
  User, School, SchoolHistory, ClubMember, Post, Follow, MemoryStreak, UserAchievement,
} = require('../models');

const generateBadges = async (userId) => {
  const badges = [];

  const user = await User.findByPk(userId, {
    attributes: ['id', 'fullName', 'createdAt'],
    include: [
      {
        model: School,
        as: 'schools',
        attributes: ['id', 'name'],
        through: { attributes: ['schoolId', 'generation', 'department', 'isCurrent'] },
      },
    ],
  });

  if (!user) return badges;

  // --- School badges ---
  const schools = user.toJSON().schools || [];
  if (schools.length > 0) {
    const currentSchool = schools.find((s) => s.SchoolHistory?.isCurrent) || schools[0];
    const schoolName = currentSchool?.name;
    if (schoolName) {
      badges.push({
        badgeId: 'school',
        label: schoolName,
        icon: '🏫',
        color: 'blue',
        category: 'school',
        metadata: { schoolId: currentSchool?.id },
      });
    }
    if (schools.length > 1) {
      badges.push({
        badgeId: 'multi_school',
        label: `${schools.length} Schools`,
        icon: '🎓',
        color: 'purple',
        category: 'school',
        metadata: { count: schools.length },
      });
    }
  }

  // --- Generation badge ---
  const generations = [...new Set(schools.map((s) => s.SchoolHistory?.generation).filter(Boolean))];
  if (generations.length > 0) {
    const gen = generations[0];
    badges.push({
      badgeId: `gen_${gen}`,
      label: `Class of ${gen}`,
      icon: '📖',
      color: 'amber',
      category: 'generation',
      metadata: { generation: gen },
    });
  }

  // --- Club badges ---
  const memberships = await ClubMember.findAll({
    where: { userId },
    attributes: ['clubId', 'role'],
  });

  const owners = memberships.filter((m) => m.role === 'owner');
  const admins = memberships.filter((m) => m.role === 'admin');

  if (owners.length > 0) {
    badges.push({
      badgeId: 'club_owner',
      label: 'Club Founder',
      icon: '👑',
      color: 'gold',
      category: 'club',
      metadata: { count: owners.length },
    });
  }
  if (admins.length > 0) {
    badges.push({
      badgeId: 'club_admin',
      label: 'Club Admin',
      icon: '🛡️',
      color: 'teal',
      category: 'club',
      metadata: { count: admins.length },
    });
  }
  if (memberships.length >= 3) {
    badges.push({
      badgeId: 'club_member',
      label: `${memberships.length} Clubs`,
      icon: '🎪',
      color: 'green',
      category: 'club',
      metadata: { count: memberships.length },
    });
  }

  // --- Streak badges ---
  const streak = await MemoryStreak.findOne({ where: { userId } });
  if (streak) {
    if (streak.currentStreak >= 365) {
      badges.push({ badgeId: 'streak_legend', label: 'Year Legend', icon: '🌟', color: 'yellow', category: 'streak', metadata: { days: streak.currentStreak } });
    } else if (streak.currentStreak >= 100) {
      badges.push({ badgeId: 'streak_century', label: 'Century Streak', icon: '💯', color: 'orange', category: 'streak', metadata: { days: streak.currentStreak } });
    } else if (streak.currentStreak >= 30) {
      badges.push({ badgeId: 'streak_monthly', label: 'Monthly Master', icon: '🔥', color: 'red', category: 'streak', metadata: { days: streak.currentStreak } });
    } else if (streak.currentStreak >= 7) {
      badges.push({ badgeId: 'streak_weekly', label: 'Week Warrior', icon: '⚔️', color: 'orange', category: 'streak', metadata: { days: streak.currentStreak } });
    }
    if (streak.longestStreak >= 100) {
      badges.push({ badgeId: 'streak_100_ever', label: '100+ Day Streak', icon: '💎', color: 'cyan', category: 'streak', metadata: { days: streak.longestStreak } });
    }
  }

  // --- Content badges ---
  const postsCount = await Post.count({ where: { userId, type: 'post' } });
  const memoriesCount = await Post.count({ where: { userId, type: 'memory' } });
  const reelsCount = await Post.count({ where: { userId, type: 'reel' } });

  if (postsCount >= 100) {
    badges.push({ badgeId: 'content_king', label: 'Content King', icon: '💎', color: 'purple', category: 'content', metadata: { count: postsCount } });
  } else if (postsCount >= 50) {
    badges.push({ badgeId: 'top_creator', label: 'Top Creator', icon: '👑', color: 'gold', category: 'content', metadata: { count: postsCount } });
  }

  if (memoriesCount >= 100) {
    badges.push({ badgeId: 'memory_legend', label: 'Memory Legend', icon: '📸', color: 'pink', category: 'content', metadata: { count: memoriesCount } });
  } else if (memoriesCount >= 50) {
    badges.push({ badgeId: 'memory_master', label: 'Memory Master', icon: '🎞️', color: 'rose', category: 'content', metadata: { count: memoriesCount } });
  } else if (memoriesCount >= 10) {
    badges.push({ badgeId: 'memory_collector', label: 'Memory Collector', icon: '📷', color: 'pink', category: 'content', metadata: { count: memoriesCount } });
  }

  if (reelsCount >= 10) {
    badges.push({ badgeId: 'reel_star', label: 'Reel Star', icon: '🎬', color: 'red', category: 'content', metadata: { count: reelsCount } });
  }

  // --- Social badges ---
  const followersCount = await Follow.count({ where: { followingId: userId } });

  if (followersCount >= 1000) {
    badges.push({ badgeId: 'influencer', label: 'Influencer', icon: '⭐', color: 'gold', category: 'social', metadata: { count: followersCount } });
  } else if (followersCount >= 100) {
    badges.push({ badgeId: 'popular', label: 'Popular', icon: '🎉', color: 'green', category: 'social', metadata: { count: followersCount } });
  } else if (followersCount >= 10) {
    badges.push({ badgeId: 'connected', label: 'Connected', icon: '👥', color: 'blue', category: 'social', metadata: { count: followersCount } });
  }

  // --- Achievement badges ---
  const achievementCount = await UserAchievement.count({ where: { userId } });
  if (achievementCount >= 10) {
    badges.push({ badgeId: 'achievement_hunter', label: 'Achievement Hunter', icon: '🏅', color: 'amber', category: 'achievement', metadata: { count: achievementCount } });
  }

  // --- Early adopter ---
  const accountAge = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAge >= 90) {
    badges.push({ badgeId: 'early_adopter', label: 'Early Adopter', icon: '🚀', color: 'cyan', category: 'special', metadata: { days: Math.floor(accountAge) } });
  }

  return badges;
};

module.exports = { generateBadges };
