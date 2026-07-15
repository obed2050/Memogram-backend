const router = require('express').Router();
const { getProfile, updateProfile, uploadProfilePhoto, uploadCoverPhoto, getUserById } = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { updateProfileValidation } = require('../validations/user.validation');

router.get('/profile', auth, getProfile);
router.get('/:id', auth, getUserById);
router.put('/profile', auth, updateProfileValidation, validate, updateProfile);
router.put('/profile/photo', auth, upload.single('profilePhoto'), uploadProfilePhoto);
router.put('/profile/cover', auth, upload.single('coverPhoto'), uploadCoverPhoto);

module.exports = router;
