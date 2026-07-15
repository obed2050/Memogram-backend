const router = require('express').Router();
const { createComment, getComments, deleteComment } = require('../controllers/comment.controller');
const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createCommentValidation } = require('../validations/comment.validation');

router.post('/', auth, createCommentValidation, validate, createComment);
router.get('/post/:postId', auth, getComments);
router.delete('/:id', auth, deleteComment);

module.exports = router;
