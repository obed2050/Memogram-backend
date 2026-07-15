const router = require('express').Router();
const {
  createAlbum, getMyAlbums, getFeed, getAlbum, updateAlbum, deleteAlbum,
  addItem, removeItem, reorderItems,
} = require('../controllers/album.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const {
  createAlbumValidation, updateAlbumValidation, addItemValidation, reorderValidation,
} = require('../validations/album.validation');

router.get('/my', auth, getMyAlbums);
router.get('/feed', auth, getFeed);
router.post('/', auth, upload.array('coverImage', 1), createAlbumValidation, validate, createAlbum);
router.get('/:id', optionalAuth, getAlbum);
router.put('/:id', auth, upload.array('coverImage', 1), updateAlbumValidation, validate, updateAlbum);
router.delete('/:id', auth, deleteAlbum);
router.post('/:id/items', auth, addItemValidation, validate, addItem);
router.delete('/:id/items/:postId', auth, removeItem);
router.put('/:id/items/reorder', auth, reorderValidation, validate, reorderItems);

module.exports = router;
