const { Op } = require('sequelize');
const { User, UserProfile, Post, Memory, Follow, SchoolHistory, MemoryStreak } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { generateBadges } = require('../services/badgeService');

exports.getExtendedProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return sendError(res, 'User not found', 404);

    let profile = await UserProfile.findOne({ where: { userId } });
    if (!profile) {
      profile = await UserProfile.create({ userId });
    }

    let streak = await MemoryStreak.findOne({ where: { userId } });
    if (!streak) {
      streak = await MemoryStreak.create({ userId });
    }

    const followersCount = await Follow.count({ where: { followingId: userId } });
    const followingCount = await Follow.count({ where: { followerId: userId } });
    const postsCount = await Post.count({ where: { userId, type: 'post' } });
    const memoriesCount = await Post.count({ where: { userId, type: 'memory' } });
    const reelsCount = await Post.count({ where: { userId, type: 'reel' } });
    const schoolsCount = await SchoolHistory.count({ where: { userId } });

    let isFollowing = false;
    if (req.userId && req.userId !== userId) {
      const follow = await Follow.findOne({ where: { followerId: req.userId, followingId: userId } });
      isFollowing = !!follow;
    }

    const badges = await generateBadges(userId);

    return sendSuccess(res, {
      user: user.toJSON(),
      profile: profile.toJSON(),
      streak: streak.toJSON(),
      badges,
      stats: { followersCount, followingCount, postsCount, memoriesCount, reelsCount, schoolsCount },
      isFollowing,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateExtendedProfile = async (req, res) => {
  try {
    const allowedFields = ['achievements', 'badges', 'skills', 'interests', 'favoriteSubjects', 'favoriteClubs'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const [profile] = await UserProfile.findOrCreate({ where: { userId: req.userId }, defaults: { userId: req.userId } });
    await profile.update(updates);

    return sendSuccess(res, { profile: profile.toJSON() }, 'Profile updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const followersCount = await Follow.count({ where: { followingId: userId } });
    const followingCount = await Follow.count({ where: { followerId: userId } });
    const postsCount = await Post.count({ where: { userId, type: 'post' } });
    const memoriesCount = await Post.count({ where: { userId, type: 'memory' } });
    const reelsCount = await Post.count({ where: { userId, type: 'reel' } });
    const schoolsCount = await SchoolHistory.count({ where: { userId } });

    return sendSuccess(res, { stats: { followersCount, followingCount, postsCount, memoriesCount, reelsCount, schoolsCount } });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
