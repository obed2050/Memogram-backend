const router = require('express').Router();
const { createMemory, getMemories, getMemoryById, deleteMemory, getSchoolMemories } = require('../controllers/memory.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/', auth, upload.array('media', 10), createMemory);
router.get('/', auth, getMemories);
router.get('/school/:schoolId', optionalAuth, getSchoolMemories);
router.get('/:id', optionalAuth, getMemoryById);
router.delete('/:id', auth, deleteMemory);

module.exports = router;
