const router = require('express').Router();
const { createPost, getFeed, getPostById, deletePost, getUserPosts } = require('../controllers/post.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { createPostValidation } = require('../validations/post.validation');

router.post('/', auth, upload.array('media', 10), createPostValidation, validate, createPost);
router.get('/feed', auth, getFeed);
router.get('/user/:userId', auth, getUserPosts);
router.get('/:id', optionalAuth, getPostById);
router.delete('/:id', auth, deletePost);

module.exports = router;
