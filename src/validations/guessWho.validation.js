const { body } = require('express-validator');

const createChallengeValidation = [
  body('hint')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Hint must be under 300 characters'),
  body('schoolId')
    .optional()
    .isUUID()
    .withMessage('Invalid school ID'),
];

const makeGuessValidation = [
  body('guessedUserId')
    .notEmpty()
    .withMessage('Please select a user')
    .isUUID()
    .withMessage('Invalid user ID'),
];

module.exports = { createChallengeValidation, makeGuessValidation };
