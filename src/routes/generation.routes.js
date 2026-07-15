const router = require('express').Router();
const {
  getMyGenerations,
  getGeneration,
  getGenerationMembers,
  getGenerationPosts,
  getGenerationMemories,
  getDiscussions,
  createDiscussion,
  getDiscussion,
  deleteDiscussion,
  getReplies,
  createReply,
  deleteReply,
} = require('../controllers/generation.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createDiscussionValidation, createReplyValidation } = require('../validations/generation.validation');

router.get('/my', auth, getMyGenerations);
router.get('/:schoolId/:generation', optionalAuth, getGeneration);
router.get('/:schoolId/:generation/members', optionalAuth, getGenerationMembers);
router.get('/:schoolId/:generation/posts', optionalAuth, getGenerationPosts);
router.get('/:schoolId/:generation/memories', optionalAuth, getGenerationMemories);

router.get('/:schoolId/:generation/discussions', optionalAuth, getDiscussions);
router.post('/:schoolId/:generation/discussions', auth, createDiscussionValidation, validate, createDiscussion);

router.get('/discussions/:discussionId', optionalAuth, getDiscussion);
router.delete('/discussions/:discussionId', auth, deleteDiscussion);

router.get('/discussions/:discussionId/replies', optionalAuth, getReplies);
router.post('/discussions/:discussionId/replies', auth, createReplyValidation, validate, createReply);
router.delete('/discussions/:discussionId/replies/:replyId', auth, deleteReply);

module.exports = router;
