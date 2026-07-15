const { Op } = require('sequelize');
const { GuessWho, GuessWhoPick, User, School, Follow } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { getPagination, paginateResponse } = require('../utils/pagination');
const { uploadToCloudinary } = require('../config/cloudinary');

const autoReveal = async () => {
  await GuessWho.update(
    { status: 'revealed' },
    { where: { status: 'active', revealAt: { [Op.lte]: new Date() } } }
  );
};

const enrichChallenge = async (item, userId) => {
  const data = item.toJSON();
  const isRevealed = data.status === 'revealed' || new Date() >= new Date(data.revealAt);

  if (isRevealed) {
    data.status = 'revealed';
    const author = await User.findByPk(data.userId, {
      attributes: ['id', 'fullName', 'username', 'profilePhoto'],
    });
    data.author = author;

    const winningPick = await GuessWhoPick.findOne({
      where: { guessWhoId: data.id, guessedUserId: data.userId },
      include: [{ model: User, as: 'guesser', attributes: ['id', 'fullName', 'username', 'profilePhoto'] }],
    });
    data.winningPick = winningPick;
  } else {
    data.author = null;
    data.winningPick = null;
  }

  if (userId) {
    const pick = await GuessWhoPick.findOne({ where: { guessWhoId: data.id, userId } });
    data.myPick = pick
      ? { guessedUserId: pick.guessedUserId, createdAt: pick.createdAt }
      : null;
  }

  return data;
};

exports.createChallenge = async (req, res) => {
  try {
    const { hint, schoolId } = req.body;

    if (!req.files || req.files.length === 0) {
      return sendError(res, 'Photo is required', 400);
    }

    const result = await uploadToCloudinary(req.files[0].path, 'memogram/guess-who');

    const revealAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const challenge = await GuessWho.create({
      userId: req.userId,
      photo: result.url,
      hint: hint || null,
      schoolId: schoolId || null,
      revealAt,
    });

    const full = await GuessWho.findByPk(challenge.id, {
      include: [
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
    });

    const data = full.toJSON();
    data.author = null;
    data.myPick = null;
    data.winningPick = null;

    return sendSuccess(res, { challenge: data }, 'Challenge created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getActive = async (req, res) => {
  try {
    await autoReveal();

    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await GuessWho.findAndCountAll({
      where: { status: 'active', revealAt: { [Op.gt]: new Date() } },
      include: [
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const items = await Promise.all(rows.map((r) => enrichChallenge(r, req.userId)));
    const result = paginateResponse(items, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getRevealed = async (req, res) => {
  try {
    await autoReveal();

    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await GuessWho.findAndCountAll({
      where: { status: 'revealed' },
      include: [
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['revealAt', 'DESC']],
      limit: queryLimit,
      offset,
      distinct: true,
    });

    const items = await Promise.all(rows.map((r) => enrichChallenge(r, req.userId)));
    const result = paginateResponse(items, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await GuessWho.findByPk(id, {
      include: [
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!item) {
      return sendError(res, 'Challenge not found', 404);
    }

    if (item.status === 'active' && new Date() >= new Date(item.revealAt)) {
      item.status = 'revealed';
      await item.save();
    }

    const data = await enrichChallenge(item, req.userId);
    return sendSuccess(res, { challenge: data });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await GuessWho.findByPk(id);
    if (!item) {
      return sendError(res, 'Challenge not found', 404);
    }

    if (item.userId !== req.userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    await GuessWhoPick.destroy({ where: { guessWhoId: id } });
    await item.destroy();

    return sendSuccess(res, null, 'Challenge deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.makeGuess = async (req, res) => {
  try {
    const { id } = req.params;
    const { guessedUserId } = req.body;

    const item = await GuessWho.findByPk(id);
    if (!item) {
      return sendError(res, 'Challenge not found', 404);
    }

    if (item.status !== 'active' || new Date() >= new Date(item.revealAt)) {
      return sendError(res, 'This challenge has already been revealed', 400);
    }

    if (item.userId === req.userId) {
      return sendError(res, 'You cannot guess on your own challenge', 400);
    }

    if (guessedUserId === req.userId) {
      return sendError(res, 'You cannot guess yourself', 400);
    }

    const existing = await GuessWhoPick.findOne({
      where: { guessWhoId: id, userId: req.userId },
    });

    if (existing) {
      return sendError(res, 'You have already guessed on this challenge', 400);
    }

    const guessedUser = await User.findByPk(guessedUserId, {
      attributes: ['id', 'fullName', 'username', 'profilePhoto'],
    });

    if (!guessedUser) {
      return sendError(res, 'User not found', 404);
    }

    await GuessWhoPick.create({
      guessWhoId: id,
      userId: req.userId,
      guessedUserId,
    });

    await item.increment('guessCount');

    return sendSuccess(res, {
      guess: {
        guesser: {
          id: req.user.id,
          fullName: req.user.fullName,
          username: req.user.username,
          profilePhoto: req.user.profilePhoto,
        },
        guessedUser,
        createdAt: new Date(),
      },
    }, 'Guess submitted', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getGuesses = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const item = await GuessWho.findByPk(id);
    if (!item) {
      return sendError(res, 'Challenge not found', 404);
    }

    const isRevealed = item.status === 'revealed' || new Date() >= new Date(item.revealAt);

    const { count, rows } = await GuessWhoPick.findAndCountAll({
      where: { guessWhoId: id },
      include: [
        { model: User, as: 'guesser', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
        ...(isRevealed
          ? [{ model: User, as: 'guessedUser', attributes: ['id', 'fullName', 'username', 'profilePhoto'] }]
          : []),
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    let picks;
    if (isRevealed) {
      picks = rows.map((r) => ({
        ...r.toJSON(),
        isCorrect: r.guessedUserId === item.userId,
      }));
    } else {
      picks = rows.map((r) => ({
        id: r.id,
        guesser: r.guesser,
        createdAt: r.createdAt,
      }));
    }

    const result = paginateResponse(picks, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

exports.getMyUploads = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(parseInt(page), parseInt(limit));

    const { count, rows } = await GuessWho.findAndCountAll({
      where: { userId: req.userId },
      include: [
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: queryLimit,
      offset,
    });

    const items = await Promise.all(rows.map(async (r) => {
      const data = r.toJSON();
      const isRevealed = data.status === 'revealed' || new Date() >= new Date(data.revealAt);
      data.author = isRevealed ? req.user : null;
      data.myPick = null;
      data.winningPick = null;

      if (isRevealed) {
        const winner = await GuessWhoPick.findOne({
          where: { guessWhoId: data.id, guessedUserId: req.userId },
          include: [{ model: User, as: 'guesser', attributes: ['id', 'fullName', 'username', 'profilePhoto'] }],
        });
        data.winningPick = winner;
      }

      return data;
    }));

    const result = paginateResponse(items, count, parseInt(page), queryLimit);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
