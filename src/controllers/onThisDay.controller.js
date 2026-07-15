const { Op } = require('sequelize');
const { sequelize, Post, Memory, User, School, Follow, Like } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');

exports.getOnThisDay = async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const currentYear = today.getFullYear();

    const following = await Follow.findAll({ where: { followerId: req.userId } });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(req.userId);

    const monthExpr = sequelize.fn('EXTRACT', sequelize.literal('MONTH from "Post"."createdAt"'));
    const dayExpr = sequelize.fn('EXTRACT', sequelize.literal('DAY from "Post"."createdAt"'));
    const yearExpr = sequelize.fn('EXTRACT', sequelize.literal('YEAR from "Post"."createdAt"'));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: {
        [Op.and]: [
          sequelize.where(monthExpr, month),
          sequelize.where(dayExpr, day),
          sequelize.where(yearExpr, { [Op.lt]: currentYear }),
        ],
        userId: { [Op.in]: followingIds },
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    const memMonthExpr = sequelize.fn('EXTRACT', sequelize.literal('MONTH from "Memory"."createdAt"'));
    const memDayExpr = sequelize.fn('EXTRACT', sequelize.literal('DAY from "Memory"."createdAt"'));
    const memYearExpr = sequelize.fn('EXTRACT', sequelize.literal('YEAR from "Memory"."createdAt"'));

    const memories = await Memory.findAll({
      where: {
        [Op.and]: [
          sequelize.where(memMonthExpr, month),
          sequelize.where(memDayExpr, day),
          sequelize.where(memYearExpr, { [Op.lt]: currentYear }),
        ],
        userId: { [Op.in]: followingIds },
      },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const allItems = [
      ...posts.map((p) => ({ ...p.toJSON(), _type: 'post' })),
      ...memories.map((m) => ({ ...m.toJSON(), _type: 'memory' })),
    ];

    allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const likedItems = await Like.findAll({
      where: {
        userId: req.userId,
        postId: { [Op.in]: allItems.filter((i) => i._type === 'post').map((i) => i.id) },
      },
    });
    const likedSet = new Set(likedItems.map((l) => l.postId));

    const enriched = allItems.map((item) => ({
      ...item,
      isLiked: likedSet.has(item.id),
    }));

    const grouped = {};
    for (const item of enriched) {
      const itemYear = new Date(item.createdAt).getFullYear();
      const yearsAgo = currentYear - itemYear;
      if (!grouped[itemYear]) {
        grouped[itemYear] = {
          yearsAgo,
          year: itemYear,
          date: new Date(itemYear, month - 1, day).toISOString(),
          items: [],
        };
      }
      grouped[itemYear].items.push(item);
    }

    const data = Object.values(grouped).sort((a, b) => a.yearsAgo - b.yearsAgo);

    const monthName = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    return sendSuccess(res, {
      today: {
        month,
        day,
        monthName,
        displayDate: today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      },
      memories: data,
      totalItems: enriched.length,
      totalYears: data.length,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
