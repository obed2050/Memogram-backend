const { Follow, User, Notification } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { checkAndAward } = require('../services/achievementService');

exports.toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId) {
      return sendError(res, 'Cannot follow yourself', 400);
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return sendError(res, 'User not found', 404);
    }

    const existingFollow = await Follow.findOne({
      where: { followerId: req.userId, followingId: userId },
    });

    if (existingFollow) {
      await existingFollow.destroy();
      return sendSuccess(res, { following: false }, 'Unfollowed');
    }

    await Follow.create({ followerId: req.userId, followingId: userId });

    if (userId !== req.userId) {
      await Notification.create({
        userId,
        senderId: req.userId,
        type: 'follow',
        content: 'started following you',
      });
    }

    await checkAndAward(userId, ['followers_10', 'followers_100', 'followers_1000']);

    return sendSuccess(res, { following: true }, 'Following');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: followers } = await Follow.findAndCountAll({
      where: { followingId: userId },
      include: [
        { model: User, as: 'follower', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const users = followers.map((f) => f.follower);
    const result = paginateResponse(users, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: following } = await Follow.findAndCountAll({
      where: { followerId: userId },
      include: [
        { model: User, as: 'following', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const users = following.map((f) => f.following);
    const result = paginateResponse(users, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getFollowCounts = async (req, res) => {
  try {
    const { userId } = req.params;
    const followersCount = await Follow.count({ where: { followingId: userId } });
    const followingCount = await Follow.count({ where: { followerId: userId } });

    let isFollowing = false;
    if (req.userId && req.userId !== userId) {
      const follow = await Follow.findOne({ where: { followerId: req.userId, followingId: userId } });
      isFollowing = !!follow;
    }

    return sendSuccess(res, { followersCount, followingCount, isFollowing });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
