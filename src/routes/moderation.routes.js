const router = require('express').Router();
const mod = require('../controllers/moderation.controller');
const { auth, adminOnly } = require('../middlewares/auth');

router.use(auth, adminOnly);

router.get('/logs', mod.getLogs);
router.get('/stats', mod.getLogStats);

router.post('/posts/:id/delete', mod.deletePost);
router.post('/users/:id/suspend', mod.suspendUser);
router.post('/users/:id/unsuspend', mod.unsuspendUser);
router.post('/comments/:id/hide', mod.hideComment);
router.post('/comments/:id/unhide', mod.unhideComment);
router.post('/comments/:id/delete', mod.deleteComment);
router.post('/events/:id/delete', mod.deleteEvent);

module.exports = router;
