const router = require('express').Router();
const {
  createBeforeNow, getFeed, getExplore, getBeforeNow, deleteBeforeNow,
  toggleLike, getLikes,
  getComments, createComment, deleteComment,
  getReplies, createReply, deleteReply,
  getUserBeforeNows,
} = require('../controllers/beforeNow.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { createBeforeNowValidation, createCommentValidation } = require('../validations/beforeNow.validation');

router.get('/feed', auth, getFeed);
router.get('/explore', auth, getExplore);
router.get('/user/:userId', auth, getUserBeforeNows);
router.post('/', auth, upload.array('media', 2), createBeforeNowValidation, validate, createBeforeNow);
router.get('/:id', optionalAuth, getBeforeNow);
router.delete('/:id', auth, deleteBeforeNow);

router.post('/:id/like', auth, toggleLike);
router.get('/:id/likes', auth, getLikes);

router.get('/:id/comments', auth, getComments);
router.post('/:id/comments', auth, createCommentValidation, validate, createComment);
router.delete('/:id/comments/:commentId', auth, deleteComment);
router.get('/:id/comments/:commentId/replies', auth, getReplies);
router.post('/:id/comments/:commentId/replies', auth, createCommentValidation, validate, createReply);
router.delete('/:id/comments/:commentId/replies/:replyId', auth, deleteReply);

module.exports = router;
