const { Op } = require('sequelize');
const {
  SavedItem, Post, User, School, Album, CommunityEvent,
} = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { trackInteraction } = require('../services/recommendationEngine');

// POST /api/saved — save an item
exports.saveItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return sendError(res, 'itemType and itemId are required', 400);
    }

    const validTypes = ['post', 'memory', 'reel', 'album', 'event'];
    if (!validTypes.includes(itemType)) {
      return sendError(res, 'Invalid itemType', 400);
    }

    const existing = await SavedItem.findOne({
      where: { userId: req.userId, itemType, itemId },
    });

    if (existing) {
      return sendSuccess(res, { saved: true }, 'Already saved');
    }

    await SavedItem.create({ userId: req.userId, itemType, itemId });
    if (itemType === 'post' || itemType === 'memory' || itemType === 'reel') {
      trackInteraction(req.userId, itemId, 'save').catch(() => {});
    }
    return sendSuccess(res, { saved: true }, 'Item saved', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// DELETE /api/saved/:itemType/:itemId — unsave an item
exports.unsaveItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    const deleted = await SavedItem.destroy({
      where: { userId: req.userId, itemType, itemId },
    });

    if (!deleted) {
      return sendError(res, 'Saved item not found', 404);
    }

    return sendSuccess(res, { saved: false }, 'Item unsaved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/saved/check/:itemType/:itemId — check if saved
exports.checkSaved = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    const saved = await SavedItem.findOne({
      where: { userId: req.userId, itemType, itemId },
    });

    return sendSuccess(res, { saved: !!saved });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/saved?type=all|post|memory|reel|album|event&page=1&limit=20
exports.getSaved = async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    if (type === 'all') {
      const results = {};
      const types = ['post', 'memory', 'reel', 'album', 'event'];
      for (const t of types) {
        const items = await getSavedByType(t, req.userId, 0, 5);
        results[t] = items;
      }
      return sendSuccess(res, { results });
    }

    const validTypes = ['post', 'memory', 'reel', 'album', 'event'];
    if (!validTypes.includes(type)) {
      return sendError(res, 'Invalid type', 400);
    }

    const { rows, total } = await getSavedByTypePaginated(type, req.userId, offset, queryLimit);
    const result = paginateResponse(rows, total, parseInt(page), queryLimit);
    return sendSuccess(res, { ...result, type });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// --- helpers ---

async function getSavedByType(type, userId, offset, limit) {
  const saved = await SavedItem.findAll({
    where: { userId, itemType: type },
    order: [['createdAt', 'DESC']],
    offset,
    limit,
  });

  if (saved.length === 0) return [];

  const itemIds = saved.map((s) => s.itemId);
  const savedMap = new Map(saved.map((s) => [s.itemId, s.createdAt]));

  const items = await fetchItemsByType(type, itemIds);
  return items.map((item) => ({
    ...item.toJSON(),
    savedAt: savedMap.get(item.id),
  }));
}

async function getSavedByTypePaginated(type, userId, offset, limit) {
  const { count, rows: saved } = await SavedItem.findAndCountAll({
    where: { userId, itemType: type },
    order: [['createdAt', 'DESC']],
    offset,
    limit,
  });

  if (saved.length === 0) return { rows: [], total: 0 };

  const itemIds = saved.map((s) => s.itemId);
  const savedMap = new Map(saved.map((s) => [s.itemId, s.createdAt]));

  const items = await fetchItemsByType(type, itemIds);
  const itemsById = new Map(items.map((i) => [i.id, i]));

  const ordered = saved
    .map((s) => {
      const item = itemsById.get(s.itemId);
      if (!item) return null;
      return { ...item.toJSON(), savedAt: s.createdAt };
    })
    .filter(Boolean);

  return { rows: ordered, total: count };
}

async function fetchItemsByType(type, ids) {
  const includeBase = [
    { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
  ];

  switch (type) {
    case 'post':
    case 'memory':
    case 'reel':
      return Post.findAll({
        where: { id: { [Op.in]: ids }, type: type === 'memory' ? 'memory' : type === 'reel' ? 'reel' : 'post' },
        include: [
          ...includeBase,
          { model: School, as: 'school', attributes: ['id', 'name'], required: false },
        ],
      });

    case 'album':
      return Album.findAll({
        where: { id: { [Op.in]: ids } },
        include: includeBase,
      });

    case 'event':
      return CommunityEvent.findAll({
        where: { id: { [Op.in]: ids } },
        include: [
          ...includeBase,
          { model: School, as: 'school', attributes: ['id', 'name'] },
        ],
      });

    default:
      return [];
  }
}
