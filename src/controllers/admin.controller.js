const { Op } = require('sequelize');
const {
  User, Post, Comment, Community, CommunityEvent, School, Club, MemoryStreak, Follow, Like, ModerationLog,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');

// ─── Dashboard Stats ───────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, totalPosts, totalMemories, totalReels,
      totalComments, totalCommunities, totalEvents, totalClubs,
      newUsers30d, newUsers7d,
      posts30d, memories30d,
    ] = await Promise.all([
      User.count(),
      Post.count({ where: { type: 'post' } }),
      Post.count({ where: { type: 'memory' } }),
      Post.count({ where: { type: 'reel' } }),
      Comment.count(),
      Community.count(),
      CommunityEvent.count(),
      Club.count(),
      User.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
      Post.count({ where: { type: 'post', createdAt: { [Op.gte]: thirtyDaysAgo } } }),
      Post.count({ where: { type: 'memory', createdAt: { [Op.gte]: thirtyDaysAgo } } }),
    ]);

    const totalPostsAll = totalPosts + totalMemories + totalReels;

    return sendSuccess(res, {
      stats: {
        totalUsers, totalPosts, totalMemories, totalReels,
        totalComments, totalCommunities, totalEvents, totalClubs,
        totalPostsAll,
        newUsers30d, newUsers7d,
        posts30d, memories30d,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── User Growth Analytics ─────────────────────────────────────
exports.getUserGrowth = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const now = new Date();
    const daysAgo = new Date(now.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);

    const users = await User.findAll({
      where: { createdAt: { [Op.gte]: daysAgo } },
      attributes: ['createdAt'],
      order: [['createdAt', 'ASC']],
    });

    const grouped = {};
    for (let i = 0; i < parseInt(days); i++) {
      const d = new Date(daysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      grouped[key] = 0;
    }

    users.forEach((u) => {
      const key = u.createdAt.toISOString().split('T')[0];
      if (grouped[key] !== undefined) grouped[key]++;
    });

    const data = Object.entries(grouped).map(([date, count]) => ({ date, count }));

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Content Analytics ─────────────────────────────────────────
exports.getContentAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const now = new Date();
    const daysAgo = new Date(now.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [posts, memories, reels, comments] = await Promise.all([
      Post.findAll({ where: { type: 'post', createdAt: { [Op.gte]: daysAgo } }, attributes: ['createdAt'], order: [['createdAt', 'ASC']] }),
      Post.findAll({ where: { type: 'memory', createdAt: { [Op.gte]: daysAgo } }, attributes: ['createdAt'], order: [['createdAt', 'ASC']] }),
      Post.findAll({ where: { type: 'reel', createdAt: { [Op.gte]: daysAgo } }, attributes: ['createdAt'], order: [['createdAt', 'ASC']] }),
      Comment.findAll({ where: { createdAt: { [Op.gte]: daysAgo } }, attributes: ['createdAt'], order: [['createdAt', 'ASC']] }),
    ]);

    const grouped = {};
    for (let i = 0; i < parseInt(days); i++) {
      const d = new Date(daysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      grouped[key] = { date: key, posts: 0, memories: 0, reels: 0, comments: 0 };
    }

    posts.forEach((p) => { const k = p.createdAt.toISOString().split('T')[0]; if (grouped[k]) grouped[k].posts++; });
    memories.forEach((p) => { const k = p.createdAt.toISOString().split('T')[0]; if (grouped[k]) grouped[k].memories++; });
    reels.forEach((p) => { const k = p.createdAt.toISOString().split('T')[0]; if (grouped[k]) grouped[k].reels++; });
    comments.forEach((c) => { const k = c.createdAt.toISOString().split('T')[0]; if (grouped[k]) grouped[k].comments++; });

    return sendSuccess(res, { data: Object.values(grouped) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Top Users ─────────────────────────────────────────────────
exports.getTopUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const users = await User.findAll({
      attributes: ['id', 'fullName', 'username', 'profilePhoto', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
    });

    const enriched = await Promise.all(
      users.map(async (u) => {
        const [postsCount, followersCount] = await Promise.all([
          Post.count({ where: { userId: u.id } }),
          Follow.count({ where: { followingId: u.id } }),
        ]);
        return { ...u.toJSON(), postsCount, followersCount };
      })
    );

    enriched.sort((a, b) => b.followersCount - a.followersCount);

    return sendSuccess(res, { users: enriched });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Users Management ──────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = {};
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return sendError(res, 'Invalid role', 400);
    }
    ModerationLog.create({
      action: 'update_role', adminId: req.userId, targetUserId: id,
      meta: { newRole: role },
    }).catch(() => {});
    await User.update({ role }, { where: { id } });
    return sendSuccess(res, null, 'User role updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.userId) return sendError(res, 'Cannot delete yourself', 400);
    ModerationLog.create({
      action: 'delete_user', adminId: req.userId, targetUserId: id,
    }).catch(() => {});
    await User.destroy({ where: { id } });
    return sendSuccess(res, null, 'User deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Posts Management ──────────────────────────────────────────
exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = '', search = '' } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = {};
    if (type && type !== 'all') where.type = type;
    if (search) where.content = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await Post.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByPk(id);
    if (post) {
      ModerationLog.create({
        action: 'delete_post', adminId: req.userId, targetUserId: post.userId,
        targetPostId: post.id, meta: { postType: post.type, postContent: post.content?.substring(0, 200) },
      }).catch(() => {});
      await Comment.destroy({ where: { postId: id } });
      await post.destroy();
    }
    return sendSuccess(res, null, 'Post deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Comments Management ───────────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const where = {};
    if (search) where.content = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await Comment.findAndCountAll({
      where,
      attributes: {
        include: [
          [require('sequelize').literal('"Comment"."hidden"'), 'isHidden'],
        ],
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: Post, as: 'post', attributes: ['id', 'content', 'type'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findByPk(id);
    if (comment) {
      ModerationLog.create({
        action: 'delete_comment', adminId: req.userId, targetUserId: comment.userId,
        targetCommentId: comment.id, targetPostId: comment.postId,
        meta: { commentContent: comment.content?.substring(0, 200) },
      }).catch(() => {});
      await Comment.destroy({ where: { parentCommentId: id } });
      await comment.destroy();
    }
    return sendSuccess(res, null, 'Comment deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Events Management ─────────────────────────────────────────
exports.getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await CommunityEvent.findAndCountAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(rows, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await CommunityEvent.findByPk(id);
    if (event) {
      ModerationLog.create({
        action: 'delete_event', adminId: req.userId, targetUserId: event.userId,
        targetEventId: event.id, meta: { eventTitle: event.title },
      }).catch(() => {});
      await event.destroy();
    }
    return sendSuccess(res, null, 'Event deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Communities Management ────────────────────────────────────
exports.getCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await Community.findAndCountAll({
      include: [
        { model: School, as: 'school', attributes: ['id', 'name', 'location', 'logo'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const enriched = await Promise.all(
      rows.map(async (c) => {
        const membersCount = await c.school?.countStudents?.() || 0;
        const eventsCount = await CommunityEvent.count({ where: { schoolId: c.schoolId } });
        return { ...c.toJSON(), membersCount, eventsCount };
      })
    );

    const result = paginateResponse(enriched, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ─── Reports (Flagged Content) ─────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const lowLikePosts = await Post.findAll({
      where: { likesCount: 0, commentsCount: 0 },
      include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'username'] }],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    const emptyPosts = await Post.findAll({
      where: { content: { [Op.or]: [{ [Op.eq]: null }, { [Op.eq]: '' }] }, images: { [Op.eq]: [] }, videos: { [Op.eq]: [] } },
      include: [{ model: User, as: 'author', attributes: ['id', 'fullName', 'username'] }],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    return sendSuccess(res, {
      lowEngagement: lowLikePosts,
      emptyPosts,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
