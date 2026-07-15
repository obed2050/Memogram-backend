const { Memory, User, School, Like } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');

exports.createMemory = async (req, res) => {
  try {
    const { caption, schoolId, generation } = req.body;

    let imageUrls = [];
    let videoUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'memogram/memories');
        if (file.mimetype.startsWith('video/')) {
          videoUrls.push(result.url);
        } else {
          imageUrls.push(result.url);
        }
      }
    }

    const memory = await Memory.create({
      userId: req.userId,
      caption,
      images: imageUrls,
      videos: videoUrls,
      schoolId: schoolId || null,
      generation: generation || null,
    });

    const fullMemory = await Memory.findByPk(memory.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
    });

    return sendSuccess(res, { memory: fullMemory }, 'Memory created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMemories = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const userInstance = await User.findByPk(req.userId);
    const userSchools = userInstance ? await userInstance.getSchools() : [];
    const schoolIds = userSchools.map((s) => s.id);

    const where = {};
    if (schoolIds.length > 0) {
      where.schoolId = { [require('sequelize').Op.in]: schoolIds };
    } else {
      where.userId = req.userId;
    }

    const { count, rows: memories } = await Memory.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const result = paginateResponse(memories, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMemoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const memory = await Memory.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
    });

    if (!memory) {
      return sendError(res, 'Memory not found', 404);
    }

    return sendSuccess(res, { memory });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteMemory = async (req, res) => {
  try {
    const { id } = req.params;

    const memory = await Memory.findByPk(id);
    if (!memory) {
      return sendError(res, 'Memory not found', 404);
    }

    if (memory.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    await memory.destroy();
    return sendSuccess(res, null, 'Memory deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getSchoolMemories = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows: memories } = await Memory.findAndCountAll({
      where: { schoolId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        { model: School, as: 'school', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const result = paginateResponse(memories, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
