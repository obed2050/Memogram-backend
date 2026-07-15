const router = require('express').Router();
const { getMyStreak, getUserStreak, getLeaderboard } = require('../controllers/streak.controller');
const { auth } = require('../middlewares/auth');

router.get('/me', auth, getMyStreak);
router.get('/leaderboard', auth, getLeaderboard);
router.get('/:userId', auth, getUserStreak);

module.exports = router;
