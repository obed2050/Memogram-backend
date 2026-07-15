const { body } = require('express-validator');

const createBeforeNowValidation = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Title must be under 200 characters'),
  body('beforeCaption')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Before caption must be under 200 characters'),
  body('afterCaption')
    .optional()
    .isLength({ max: 200 })
    .withMessage('After caption must be under 200 characters'),
  body('beforeYear')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Before year must be under 20 characters'),
  body('afterYear')
    .optional()
    .isLength({ max: 20 })
    .withMessage('After year must be under 20 characters'),
  body('schoolId')
    .optional()
    .isUUID()
    .withMessage('Invalid school ID'),
  body('generation')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Generation must be under 20 characters'),
];

const createCommentValidation = [
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment must be under 1000 characters'),
];

module.exports = { createBeforeNowValidation, createCommentValidation };
