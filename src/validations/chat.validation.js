const { body, param, query } = require('express-validator');

const sendMessage = [
  body('content')
    .optional({ values: 'null' })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Message content must be under 5000 characters'),
  body('conversationId')
    .optional()
    .isUUID()
    .withMessage('Invalid conversation ID'),
  body('replyToId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('Invalid reply message ID'),
  body('attachments')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 attachments allowed'),
  body('attachments.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid attachment URL'),
  body('attachments.*.type')
    .optional()
    .isIn(['image', 'video'])
    .withMessage('Attachment type must be image or video'),
];

const editMessage = [
  param('messageId').isUUID().withMessage('Invalid message ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be 1-5000 characters'),
];

const deleteMessage = [
  param('messageId').isUUID().withMessage('Invalid message ID'),
];

const getMessages = [
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
];

const searchMessages = [
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  query('q').trim().isLength({ min: 1, max: 100 }).withMessage('Search query required (max 100 chars)'),
];

const toggleReaction = [
  param('messageId').isUUID().withMessage('Invalid message ID'),
  body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji is required'),
];

const forwardMessage = [
  param('messageId').isUUID().withMessage('Invalid message ID'),
  body('conversationId').isUUID().withMessage('Target conversation ID is required'),
];

module.exports = {
  sendMessage,
  editMessage,
  deleteMessage,
  getMessages,
  searchMessages,
  toggleReaction,
  forwardMessage,
};
