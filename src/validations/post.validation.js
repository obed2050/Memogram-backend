const { body } = require('express-validator');

const createPostValidation = [
  body('content')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Content must be under 5000 characters'),
  body('type')
    .optional()
    .isIn(['post', 'memory', 'reel'])
    .withMessage('Invalid post type'),
  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Invalid visibility'),
];

module.exports = { createPostValidation };
