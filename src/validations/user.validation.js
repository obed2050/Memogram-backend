const { body } = require('express-validator');

const updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be 2-100 characters'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be under 500 characters'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date of birth'),
  body('currentSchool')
    .optional()
    .isLength({ max: 255 })
    .withMessage('School name too long'),
  body('generation')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Generation too long'),
];

module.exports = { updateProfileValidation };
