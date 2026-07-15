const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isTokenBlacklisted, cacheGet, cacheSet } = require('../services/redis.service');

const USER_CACHE_KEY = (id) => `user:${id}`;
const USER_CACHE_TTL = 120;

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Token revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await cacheGet(USER_CACHE_KEY(decoded.id));
    if (!user) {
      const dbUser = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
      });
      if (!dbUser) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      user = dbUser.toJSON();
      await cacheSet(USER_CACHE_KEY(decoded.id), user, USER_CACHE_TTL);
    }

    if (user.suspended && user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Account suspended',
          suspendedUntil: user.suspendedUntil,
          reason: user.suspensionReason,
        });
      }
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;

    if (token) {
      if (!(await isTokenBlacklisted(token))) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user = await cacheGet(USER_CACHE_KEY(decoded.id));
        if (!user) {
          const dbUser = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password'] },
          });
          if (dbUser) {
            user = dbUser.toJSON();
            await cacheSet(USER_CACHE_KEY(decoded.id), user, USER_CACHE_TTL);
          }
        }

        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
  } catch (error) {
    // Continue without auth
  }
  next();
};

const adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Authorization error' });
  }
};

module.exports = { auth, optionalAuth, adminOnly };
