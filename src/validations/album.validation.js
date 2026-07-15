const { body } = require('express-validator');

const createAlbumValidation = [
  body('name')
    .notEmpty()
    .withMessage('Album name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be under 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be under 500 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Invalid visibility'),
  body('sortBy')
    .optional()
    .isIn(['newest', 'oldest', 'title', 'custom'])
    .withMessage('Invalid sort option'),
];

const updateAlbumValidation = [
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Name must be under 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be under 500 characters'),
  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Invalid visibility'),
  body('sortBy')
    .optional()
    .isIn(['newest', 'oldest', 'title', 'custom'])
    .withMessage('Invalid sort option'),
];

const addItemValidation = [
  body('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .isUUID()
    .withMessage('Invalid post ID'),
];

const reorderValidation = [
  body('postIds')
    .isArray()
    .withMessage('postIds must be an array'),
  body('postIds.*')
    .isUUID()
    .withMessage('Each item must be a valid UUID'),
];

module.exports = { createAlbumValidation, updateAlbumValidation, addItemValidation, reorderValidation };
