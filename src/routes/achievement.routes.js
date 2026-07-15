const router = require('express').Router();
const { getMyAchievements, getUserAchievements, recheckAchievements } = require('../controllers/achievement.controller');
const { auth } = require('../middlewares/auth');

router.get('/me', auth, getMyAchievements);
router.post('/recheck', auth, recheckAchievements);
router.get('/:userId', auth, getUserAchievements);

module.exports = router;
