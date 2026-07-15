const router = require('express').Router();
const { getExtendedProfile, updateExtendedProfile, getUserStats } = require('../controllers/profile.controller');
const { auth, optionalAuth } = require('../middlewares/auth');

router.get('/:userId', optionalAuth, getExtendedProfile);
router.get('/:userId/stats', auth, getUserStats);
router.put('/', auth, updateExtendedProfile);

module.exports = router;
