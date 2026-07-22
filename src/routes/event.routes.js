const router = require('express').Router();
const {
  getEvent, updateEvent, deleteEvent,
  uploadEventImages, removeEventImage,
  uploadEventVideos, removeEventVideo,
  toggleAttendance, getAttendees,
  getComments, createComment, deleteComment,
  getReplies, createReply, deleteReply,
  getLinkedMemories, linkMemory, unlinkMemory,
} = require('../controllers/event.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { updateEventValidation, createCommentValidation } = require('../validations/event.validation');

router.get('/:eventId', optionalAuth, getEvent);
router.put('/:eventId', auth, updateEventValidation, validate, updateEvent);
router.delete('/:eventId', auth, deleteEvent);

router.post('/:eventId/images', auth, upload.array('images', 10), uploadEventImages);
router.delete('/:eventId/images/:index', auth, removeEventImage);

router.post('/:eventId/videos', auth, upload.array('videos', 5), uploadEventVideos);
router.delete('/:eventId/videos/:index', auth, removeEventVideo);

router.post('/:eventId/attend', auth, toggleAttendance);
router.get('/:eventId/attendees', optionalAuth, getAttendees);

router.get('/:eventId/comments', optionalAuth, getComments);
router.post('/:eventId/comments', auth, createCommentValidation, validate, createComment);
router.delete('/:eventId/comments/:commentId', auth, deleteComment);

router.get('/:eventId/comments/:commentId/replies', optionalAuth, getReplies);
router.post('/:eventId/comments/:commentId/replies', auth, createCommentValidation, validate, createReply);
router.delete('/:eventId/comments/:commentId/replies/:replyId', auth, deleteReply);

router.get('/:eventId/memories', optionalAuth, getLinkedMemories);
router.post('/:eventId/memories/:memoryId', auth, linkMemory);
router.delete('/:eventId/memories/:memoryId', auth, unlinkMemory);

module.exports = router;
