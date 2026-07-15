const { body } = require('express-validator');

const createClubValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Club name is required (max 255 characters)'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be under 2000 characters'),
  body('schoolId')
    .isUUID()
    .withMessage('Valid school ID is required'),
];

const updateClubValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be 1-255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be under 2000 characters'),
];

module.exports = { createClubValidation, updateClubValidation };
