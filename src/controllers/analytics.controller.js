const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const { AnalyticsEvent, Post, Memory, User, SchoolHistory, ClubMember, sequelize } = require('../models');
const { getOnlineUsers } = require('../services/redis.service');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/analytics/daily-users?days=30
exports.getDailyUsers = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 86400000);

    const rows = await AnalyticsEvent.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', fn('DISTINCT', col('userId'))), 'unique_users'],
      ],
      where: {
        eventType: 'user_visit',
        createdAt: { [Op.gte]: since },
      },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']],
      raw: true,
    });

    // Fill missing dates with 0
    const result = [];
    const dateMap = {};
    rows.forEach((r) => { dateMap[r.date] = parseInt(r.unique_users); });
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, users: dateMap[key] || 0 });
    }

    return sendSuccess(res, { data: result });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/analytics/monthly-users?months=12
exports.getMonthlyUsers = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 24);
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await AnalyticsEvent.findAll({
      attributes: [
        [fn('TO_CHAR', col('createdAt'), 'YYYY-MM'), 'month'],
        [fn('COUNT', fn('DISTINCT', col('userId'))), 'unique_users'],
      ],
      where: {
        eventType: 'user_visit',
        createdAt: { [Op.gte]: since },
      },
      group: [fn('TO_CHAR', col('createdAt'), 'YYYY-MM')],
      order: [[fn('TO_CHAR', col('createdAt'), 'YYYY-MM'), 'ASC']],
      raw: true,
    });

    const result = [];
    const monthMap = {};
    rows.forEach((r) => { monthMap[r.month] = parseInt(r.unique_users); });
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - months + 1 + i);
      const key = d.toISOString().slice(0, 7);
      result.push({ month: key, users: monthMap[key] || 0 });
    }

    return sendSuccess(res, { data: result });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/analytics/active-sessions
exports.getActiveSessions = async (req, res) => {
  try {
    const onlineUsers = await getOnlineUsers();
    const onlineCount = onlineUsers.length;

    // Also get DB-based 7-day DAU for context
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const weeklyDAU = await AnalyticsEvent.count({
      where: {
        eventType: 'user_visit',
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      distinct: true,
      col: 'userId',
    });

    return sendSuccess(res, {
      onlineCount,
      weeklyActiveUsers: weeklyDAU,
      onlineUserIds: onlineUsers.slice(0, 50),
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/analytics/popular-reels?limit=10&days=30
exports.getPopularReels = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 86400000);

    const reels = await Post.findAll({
      where: {
        type: 'reel',
        createdAt: { [Op.gte]: since },
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [[literal('"likesCount" + "commentsCount"'), 'DESC']],
      limit,
    });

    const result = reels.map((r) => ({
      id: r.id,
      content: r.content?.slice(0, 120) || '',
      thumbnail: r.videos?.[0] || r.images?.[0] || null,
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      engagement: r.likesCount + r.commentsCount,
      createdAt: r.createdAt,
      author: r.author,
    }));

    return sendSuccess(res, { data: result, total: reels.length });
  } catch (error) {
    // Fallback: simple order if literal fails
    try {
      const reels = await Post.findAll({
        where: {
          type: 'reel',
          createdAt: { [Op.gte]: new Date(Date.now() - (parseInt(req.query.days) || 30) * 86400000) },
        },
        include: [
          { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        ],
        order: [['likesCount', 'DESC']],
        limit: parseInt(req.query.limit) || 10,
      });
      const result = reels.map((r) => ({
        id: r.id,
        content: r.content?.slice(0, 120) || '',
        thumbnail: r.videos?.[0] || r.images?.[0] || null,
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        engagement: r.likesCount + r.commentsCount,
        createdAt: r.createdAt,
        author: r.author,
      }));
      return sendSuccess(res, { data: result, total: reels.length });
    } catch (e2) {
      return sendError(res, e2.message, 500);
    }
  }
};

// GET /api/analytics/popular-memories?limit=10&days=30
exports.getPopularMemories = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 86400000);

    const memories = await Memory.findAll({
      where: {
        createdAt: { [Op.gte]: since },
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['likesCount', 'DESC']],
      limit,
    });

    const result = memories.map((m) => ({
      id: m.id,
      caption: m.caption?.slice(0, 120) || '',
      thumbnail: m.images?.[0] || m.videos?.[0] || null,
      likesCount: m.likesCount,
      commentsCount: m.commentsCount,
      engagement: m.likesCount + m.commentsCount,
      createdAt: m.createdAt,
      author: m.author,
    }));

    return sendSuccess(res, { data: result, total: memories.length });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/analytics/community-growth?months=12
exports.getCommunityGrowth = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 24);
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    // New school members per month
    const schoolRows = await SchoolHistory.findAll({
      attributes: [
        [fn('TO_CHAR', col('createdAt'), 'YYYY-MM'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: since } },
      group: [fn('TO_CHAR', col('createdAt'), 'YYYY-MM')],
      order: [[fn('TO_CHAR', col('createdAt'), 'YYYY-MM'), 'ASC']],
      raw: true,
    });

    // New club members per month
    const clubRows = await ClubMember.findAll({
      attributes: [
        [fn('TO_CHAR', col('createdAt'), 'YYYY-MM'), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: since } },
      group: [fn('TO_CHAR', col('createdAt'), 'YYYY-MM')],
      order: [[fn('TO_CHAR', col('createdAt'), 'YYYY-MM'), 'ASC']],
      raw: true,
    });

    const schoolMap = {};
    schoolRows.forEach((r) => { schoolMap[r.month] = parseInt(r.count); });
    const clubMap = {};
    clubRows.forEach((r) => { clubMap[r.month] = parseInt(r.count); });

    // Cumulative totals
    const totalSchoolMembers = await SchoolHistory.count();
    const totalClubMembers = await ClubMember.count();

    const result = [];
    let cumSchool = 0;
    let cumClub = 0;
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - months + 1 + i);
      const key = d.toISOString().slice(0, 7);
      cumSchool += schoolMap[key] || 0;
      cumClub += clubMap[key] || 0;
      result.push({
        month: key,
        schoolMembers: schoolMap[key] || 0,
        clubMembers: clubMap[key] || 0,
        cumulativeSchool: cumSchool,
        cumulativeClub: cumClub,
      });
    }

    return sendSuccess(res, {
      data: result,
      totals: { schoolMembers: totalSchoolMembers, clubMembers: totalClubMembers },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/analytics/overview — summary cards
exports.getOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [dau, wau, mau, totalUsers] = await Promise.all([
      AnalyticsEvent.count({
        where: { eventType: 'user_visit', createdAt: { [Op.gte]: today } },
        distinct: true, col: 'userId',
      }),
      AnalyticsEvent.count({
        where: { eventType: 'user_visit', createdAt: { [Op.gte]: sevenDaysAgo } },
        distinct: true, col: 'userId',
      }),
      AnalyticsEvent.count({
        where: { eventType: 'user_visit', createdAt: { [Op.gte]: thirtyDaysAgo } },
        distinct: true, col: 'userId',
      }),
      User.count(),
    ]);

    const onlineUsers = await getOnlineUsers();

    return sendSuccess(res, {
      dau, wau, mau, totalUsers,
      onlineNow: onlineUsers.length,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// POST /api/analytics/track — record a visit (called on app load)
exports.trackVisit = async (req, res) => {
  try {
    const userId = req.userId || null;
    await AnalyticsEvent.create({
      eventType: 'user_visit',
      userId,
      metadata: {
        path: req.body.path || '/',
        userAgent: req.headers['user-agent']?.slice(0, 200),
      },
    });
    return sendSuccess(res, null, 'Tracked');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
