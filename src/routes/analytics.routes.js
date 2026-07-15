const router = require('express').Router();
const { auth, adminOnly } = require('../middlewares/auth');
const analytics = require('../controllers/analytics.controller');

// Public-ish: track a visit (requires auth)
router.post('/track', auth, analytics.trackVisit);

// Admin-only analytics
router.get('/overview', auth, adminOnly, analytics.getOverview);
router.get('/daily-users', auth, adminOnly, analytics.getDailyUsers);
router.get('/monthly-users', auth, adminOnly, analytics.getMonthlyUsers);
router.get('/active-sessions', auth, adminOnly, analytics.getActiveSessions);
router.get('/popular-reels', auth, adminOnly, analytics.getPopularReels);
router.get('/popular-memories', auth, adminOnly, analytics.getPopularMemories);
router.get('/community-growth', auth, adminOnly, analytics.getCommunityGrowth);

module.exports = router;
