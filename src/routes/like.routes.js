const router = require('express').Router();
const { toggleLike, getPostLikes } = require('../controllers/like.controller');
const { auth } = require('../middlewares/auth');

router.post('/toggle/:postId', auth, toggleLike);
router.get('/post/:postId', auth, getPostLikes);

module.exports = router;
