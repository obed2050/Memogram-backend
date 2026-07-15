const router = require('express').Router();
const { getMyBadges, getUserBadges } = require('../controllers/badge.controller');
const { auth, optionalAuth } = require('../middlewares/auth');

router.get('/me', auth, getMyBadges);
router.get('/:userId', optionalAuth, getUserBadges);

module.exports = router;
