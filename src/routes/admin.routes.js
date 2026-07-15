const router = require('express').Router();
const admin = require('../controllers/admin.controller');
const { auth, adminOnly } = require('../middlewares/auth');

router.use(auth, adminOnly);

router.get('/dashboard', admin.getDashboardStats);
router.get('/analytics/users', admin.getUserGrowth);
router.get('/analytics/content', admin.getContentAnalytics);
router.get('/analytics/top-users', admin.getTopUsers);

router.get('/users', admin.getUsers);
router.put('/users/:id/role', admin.updateUserRole);
router.delete('/users/:id', admin.deleteUser);

router.get('/posts', admin.getPosts);
router.delete('/posts/:id', admin.deletePost);

router.get('/comments', admin.getComments);
router.delete('/comments/:id', admin.deleteComment);

router.get('/events', admin.getEvents);
router.delete('/events/:id', admin.deleteEvent);

router.get('/communities', admin.getCommunities);

router.get('/reports', admin.getReports);

module.exports = router;
