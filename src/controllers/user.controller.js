const { User, School, SchoolHistory, Follow } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: School,
          as: 'schools',
          attributes: ['id', 'name', 'location', 'logo'],
          through: {
            attributes: ['generation', 'department', 'className', 'startDate', 'endDate', 'isCurrent'],
          },
        },
      ],
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const followersCount = await Follow.count({ where: { followingId: req.userId } });
    const followingCount = await Follow.count({ where: { followerId: req.userId } });
    const profileData = user.toJSON();
    profileData.followersCount = followersCount;
    profileData.followingCount = followingCount;

    return sendSuccess(res, { user: profileData });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: School,
          as: 'schools',
          attributes: ['id', 'name', 'location', 'logo'],
          through: {
            attributes: ['generation', 'department', 'className', 'startDate', 'endDate', 'isCurrent'],
          },
        },
      ],
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const followersCount = await Follow.count({ where: { followingId: id } });
    const followingCount = await Follow.count({ where: { followerId: id } });

    let isFollowing = false;
    if (req.userId) {
      const follow = await Follow.findOne({ where: { followerId: req.userId, followingId: id } });
      isFollowing = !!follow;
    }

    const profileData = user.toJSON();
    profileData.followersCount = followersCount;
    profileData.followingCount = followingCount;
    profileData.isFollowing = isFollowing;

    return sendSuccess(res, { user: profileData });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['fullName', 'bio', 'gender', 'dateOfBirth', 'currentSchool', 'generation'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await User.update(updates, { where: { id: req.userId } });

    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
    });

    return sendSuccess(res, { user: user.toSafeObject() }, 'Profile updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const result = await uploadToCloudinary(req.file.path, 'memogram/profiles');

    await User.update({ profilePhoto: result.url }, { where: { id: req.userId } });

    return sendSuccess(res, { profilePhoto: result.url }, 'Profile photo updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const result = await uploadToCloudinary(req.file.path, 'memogram/covers');

    await User.update({ coverPhoto: result.url }, { where: { id: req.userId } });

    return sendSuccess(res, { coverPhoto: result.url }, 'Cover photo updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
