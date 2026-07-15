const router = require('express').Router();
const {
  getMyCommunities,
  getCommunityBySchool,
  updateCommunity,
  uploadCommunityBanner,
  getCommunityMembers,
  getCommunityPosts,
  getCommunityMemories,
  getCommunityEvents,
  createCommunityEvent,
  deleteCommunityEvent,
  browseCommunities,
} = require('../controllers/community.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { updateCommunityValidation, createEventValidation } = require('../validations/community.validation');

router.get('/my', auth, getMyCommunities);
router.get('/browse', optionalAuth, browseCommunities);
router.get('/:schoolId', optionalAuth, getCommunityBySchool);
router.put('/:schoolId', auth, updateCommunityValidation, validate, updateCommunity);
router.put('/:schoolId/banner', auth, upload.single('banner'), uploadCommunityBanner);
router.get('/:schoolId/members', optionalAuth, getCommunityMembers);
router.get('/:schoolId/posts', optionalAuth, getCommunityPosts);
router.get('/:schoolId/memories', optionalAuth, getCommunityMemories);
router.get('/:schoolId/events', optionalAuth, getCommunityEvents);
router.post('/:schoolId/events', auth, upload.single('coverImage'), createEventValidation, validate, createCommunityEvent);
router.delete('/:schoolId/events/:eventId', auth, deleteCommunityEvent);

module.exports = router;
