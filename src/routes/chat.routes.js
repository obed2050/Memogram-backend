const router = require('express').Router();
const {
  getConversations, getOrCreateConversation, getMessages, markAsRead,
  editMessage, deleteMessage, searchMessages, uploadChatMedia,
  toggleReaction, forwardMessage,
} = require('../controllers/chat.controller');
const { auth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const validate = require('../middlewares/validate');
const rateLimit = require('../middlewares/rateLimit');
const chatValidation = require('../validations/chat.validation');

const messageRateLimit = rateLimit({ windowMs: 60000, max: 30, message: 'Too many messages. Slow down.' });

router.get('/conversations', auth, getConversations);
router.post('/conversations', auth, getOrCreateConversation);
router.get('/messages/:conversationId', auth, chatValidation.getMessages, validate, getMessages);
router.put('/messages/read/:conversationId', auth, markAsRead);
router.put('/messages/:messageId', auth, chatValidation.editMessage, validate, editMessage);
router.delete('/messages/:messageId', auth, chatValidation.deleteMessage, validate, deleteMessage);
router.get('/messages/:conversationId/search', auth, chatValidation.searchMessages, validate, searchMessages);
router.post('/upload', auth, upload.single('file'), uploadChatMedia);
router.post('/messages/:messageId/reaction', auth, chatValidation.toggleReaction, validate, toggleReaction);
router.post('/messages/:messageId/forward', auth, chatValidation.forwardMessage, validate, forwardMessage);

module.exports = router;
