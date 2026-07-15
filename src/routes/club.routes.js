const router = require('express').Router();
const {
  getMyClubs, getClub, createClub, updateClub, deleteClub,
  toggleMembership, getMembers,
  getFeed, getPhotos, getVideos, getEvents, createEvent,
  browseClubs,
} = require('../controllers/club.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { createClubValidation, updateClubValidation } = require('../validations/club.validation');

router.get('/my', auth, getMyClubs);
router.get('/browse', optionalAuth, browseClubs);
router.post('/', auth, upload.array('media', 2), createClubValidation, validate, createClub);

router.get('/:clubId', optionalAuth, getClub);
router.put('/:clubId', auth, upload.array('media', 2), updateClubValidation, validate, updateClub);
router.delete('/:clubId', auth, deleteClub);

router.post('/:clubId/join', auth, toggleMembership);
router.get('/:clubId/members', optionalAuth, getMembers);

router.get('/:clubId/feed', optionalAuth, getFeed);
router.get('/:clubId/photos', optionalAuth, getPhotos);
router.get('/:clubId/videos', optionalAuth, getVideos);
router.get('/:clubId/events', optionalAuth, getEvents);
router.post('/:clubId/events', auth, upload.single('coverImage'), createEvent);

module.exports = router;
