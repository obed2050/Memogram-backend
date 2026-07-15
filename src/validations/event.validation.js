const { body } = require('express-validator');

const createEventValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required (max 255 characters)'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('eventDate')
    .isISO8601()
    .withMessage('Valid event date is required'),
  body('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be under 255 characters'),
  body('eventType')
    .optional()
    .isIn(['graduation', 'sports', 'trip', 'talent_show', 'science_fair', 'cultural', 'other'])
    .withMessage('Invalid event type'),
];

const updateEventValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be 1-255 characters'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('eventDate')
    .optional()
    .isISO8601()
    .withMessage('Valid event date required'),
  body('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be under 255 characters'),
  body('eventType')
    .optional()
    .isIn(['graduation', 'sports', 'trip', 'talent_show', 'science_fair', 'cultural', 'other'])
    .withMessage('Invalid event type'),
];

const createCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment is required (max 2000 characters)'),
];

module.exports = { createEventValidation, updateEventValidation, createCommentValidation };
