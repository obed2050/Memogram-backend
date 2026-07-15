const router = require('express').Router();
const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth');

router.get('/', auth, getNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.put('/read/:id', auth, markAsRead);
router.put('/read-all', auth, markAllAsRead);

module.exports = router;
