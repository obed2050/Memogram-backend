const { body } = require('express-validator');

const createDiscussionValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title is required (max 500 characters)'),
  body('content')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('Content must be under 10000 characters'),
];

const createReplyValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Reply content is required (max 5000 characters)'),
];

module.exports = { createDiscussionValidation, createReplyValidation };
