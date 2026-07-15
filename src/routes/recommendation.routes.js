const router = require('express').Router();
const rec = require('../controllers/recommendation.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', rec.getRecommendations);
router.get('/stats', rec.getStats);
router.get('/similar/:postId', rec.getSimilarPosts);
router.post('/interact/:postId', rec.trackInteraction);
router.post('/tag/:postId', rec.autoTag);

module.exports = router;
