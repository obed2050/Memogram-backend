const router = require('express').Router();
const {
  createDraft, getDrafts, getDraft, updateDraft, deleteDraft, publishDraft,
} = require('../controllers/draft.controller');
const { auth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/', auth, getDrafts);
router.post('/', auth, upload.array('media', 10), createDraft);
router.get('/:id', auth, getDraft);
router.put('/:id', auth, upload.array('media', 10), updateDraft);
router.delete('/:id', auth, deleteDraft);
router.post('/:id/publish', auth, publishDraft);

module.exports = router;
