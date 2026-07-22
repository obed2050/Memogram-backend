const { Op } = require('sequelize');
const { Album, AlbumItem, Post, User, School, Follow, Like } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');

const SORT_MAP = {
  newest: [['createdAt', 'DESC']],
  oldest: [['createdAt', 'ASC']],
  title: [[{ model: Post }, 'content', 'ASC']],
  custom: [['order', 'ASC']],
};

const enrichAlbum = async (album, userId) => {
  const data = album.toJSON();
  data.isOwner = userId ? album.userId === userId : false;
  return data;
};

exports.createAlbum = async (req, res) => {
  try {
    const { name, description, visibility, sortBy } = req.body;

    let coverImage = null;
    if (req.files && req.files.length > 0) {
      const result = await uploadToCloudinary(req.files[0].path, 'memogram/albums');
      coverImage = result.url;
    }

    const album = await Album.create({
      userId: req.userId,
      name,
      description: description || null,
      coverImage,
      visibility: visibility || 'public',
      sortBy: sortBy || 'newest',
    });

    const full = await Album.findByPk(album.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { album: full }, 'Album created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMyAlbums = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await Album.findAndCountAll({
      where: { userId: req.userId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
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

exports.getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const following = await Follow.findAll({ where: { followerId: req.userId } });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(req.userId);

    const { count, rows } = await Album.findAndCountAll({
      where: {
        visibility: { [Op.in]: ['public'] },
        userId: { [Op.in]: followingIds },
      },
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

exports.getAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const album = await Album.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    if (!album) {
      return sendError(res, 'Album not found', 404);
    }

    const data = album.toJSON();
    data.isOwner = album.userId === req.userId;

    const items = await AlbumItem.findAll({
      where: { albumId: id },
      include: [
        {
          model: Post,
          as: 'post',
          include: [
            { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
            { model: School, as: 'school', attributes: ['id', 'name'], required: false },
          ],
        },
      ],
      order: album.sortBy === 'custom'
        ? [['order', 'ASC']]
        : album.sortBy === 'oldest'
          ? [[{ model: Post }, 'createdAt', 'ASC']]
          : album.sortBy === 'title'
            ? [[{ model: Post }, 'content', 'ASC']]
            : [[{ model: Post }, 'createdAt', 'DESC']],
    });

    const likedItems = await Like.findAll({
      where: {
        userId: req.userId,
        postId: { [Op.in]: items.map((i) => i.postId) },
      },
    });
    const likedSet = new Set(likedItems.map((l) => l.postId));

    data.items = items.map((item) => ({
      ...item.toJSON(),
      post: {
        ...item.post.toJSON(),
        isLiked: likedSet.has(item.postId),
      },
    }));

    return sendSuccess(res, { album: data });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.updateAlbum = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, visibility, sortBy } = req.body;

    const album = await Album.findByPk(id);
    if (!album) {
      return sendError(res, 'Album not found', 404);
    }

    if (album.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    if (req.files && req.files.length > 0) {
      const result = await uploadToCloudinary(req.files[0].path, 'memogram/albums');
      album.coverImage = result.url;
    }

    if (name !== undefined) album.name = name;
    if (description !== undefined) album.description = description;
    if (visibility !== undefined) album.visibility = visibility;
    if (sortBy !== undefined) album.sortBy = sortBy;

    await album.save();

    const full = await Album.findByPk(album.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      ],
    });

    return sendSuccess(res, { album: full }, 'Album updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteAlbum = async (req, res) => {
  try {
    const { id } = req.params;

    const album = await Album.findByPk(id);
    if (!album) {
      return sendError(res, 'Album not found', 404);
    }

    if (album.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    await AlbumItem.destroy({ where: { albumId: id } });
    await album.destroy();

    return sendSuccess(res, null, 'Album deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.addItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { postId } = req.body;

    const album = await Album.findByPk(id);
    if (!album) {
      return sendError(res, 'Album not found', 404);
    }

    if (album.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    const post = await Post.findByPk(postId);
    if (!post) {
      return sendError(res, 'Post not found', 404);
    }

    const existing = await AlbumItem.findOne({ where: { albumId: id, postId } });
    if (existing) {
      return sendError(res, 'Post already in album', 409);
    }

    const maxOrder = await AlbumItem.max('order', { where: { albumId: id } }) || 0;

    const item = await AlbumItem.create({
      albumId: id,
      postId,
      order: maxOrder + 1,
    });

    await album.increment('postsCount');

    const full = await AlbumItem.findByPk(item.id, {
      include: [
        {
          model: Post,
          as: 'post',
          include: [
            { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
            { model: School, as: 'school', attributes: ['id', 'name'], required: false },
          ],
        },
      ],
    });

    return sendSuccess(res, { item: full }, 'Post added to album', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.removeItem = async (req, res) => {
  try {
    const { id, postId } = req.params;

    const album = await Album.findByPk(id);
    if (!album) {
      return sendError(res, 'Album not found', 404);
    }

    if (album.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    const item = await AlbumItem.findOne({ where: { albumId: id, postId } });
    if (!item) {
      return sendError(res, 'Item not found in album', 404);
    }

    await item.destroy();
    await album.decrement('postsCount');

    return sendSuccess(res, null, 'Post removed from album');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.reorderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { postIds } = req.body;

    const album = await Album.findByPk(id);
    if (!album) {
      return sendError(res, 'Album not found', 404);
    }

    if (album.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    await Promise.all(
      postIds.map((postId, index) =>
        AlbumItem.update({ order: index + 1 }, { where: { albumId: id, postId } })
      )
    );

    album.sortBy = 'custom';
    await album.save();

    return sendSuccess(res, null, 'Album reordered');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
