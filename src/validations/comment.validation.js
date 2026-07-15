const { body } = require('express-validator');

const createCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be 1-2000 characters'),
  body('parentCommentId')
    .optional()
    .isUUID()
    .withMessage('Invalid parent comment ID'),
];

module.exports = { createCommentValidation };
