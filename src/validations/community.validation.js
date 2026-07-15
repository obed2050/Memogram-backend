const { body } = require('express-validator');

const updateCommunityValidation = [
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be under 2000 characters'),
  body('rules')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Rules must be under 5000 characters'),
];

const createEventValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required (max 255 characters)'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be under 2000 characters'),
  body('eventDate')
    .isISO8601()
    .withMessage('Valid event date is required'),
  body('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be under 255 characters'),
];

module.exports = { updateCommunityValidation, createEventValidation };
