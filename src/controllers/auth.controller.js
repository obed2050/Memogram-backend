const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { uploadToCloudinary } = require('../config/cloudinary');
const { blacklistToken, cacheDel } = require('../services/redis.service');
const { AnalyticsEvent } = require('../models');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

exports.register = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return sendError(res, 'Email already registered', 409);
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return sendError(res, 'Username already taken', 409);
    }

    const user = await User.create({ fullName, username, email, password });
    const token = generateToken(user.id);

    AnalyticsEvent.create({ eventType: 'user_visit', userId: user.id, metadata: { action: 'register' } }).catch(() => {});

    return sendSuccess(res, { user: user.toSafeObject(), token }, 'Registration successful', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const token = generateToken(user.id);

    AnalyticsEvent.create({ eventType: 'user_visit', userId: user.id, metadata: { action: 'login' } }).catch(() => {});

    return sendSuccess(res, { user: user.toSafeObject(), token }, 'Login successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 30 * 24 * 3600;
        await blacklistToken(token, Math.max(ttl, 0));
        await cacheDel(`user:${decoded.id}`);
      } catch {}
    }
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
    });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    AnalyticsEvent.create({ eventType: 'user_visit', userId: req.userId, metadata: { action: 'getMe' } }).catch(() => {});

    return sendSuccess(res, { user: user.toSafeObject() });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
