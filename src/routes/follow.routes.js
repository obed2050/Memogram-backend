const router = require('express').Router();
const { toggleFollow, getFollowers, getFollowing, getFollowCounts } = require('../controllers/follow.controller');
const { auth } = require('../middlewares/auth');

router.post('/toggle/:userId', auth, toggleFollow);
router.get('/followers/:userId', auth, getFollowers);
router.get('/following/:userId', auth, getFollowing);
router.get('/counts/:userId', auth, getFollowCounts);

module.exports = router;
