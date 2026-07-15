const router = require('express').Router();
const { saveItem, unsaveItem, checkSaved, getSaved } = require('../controllers/savedItem.controller');
const { auth } = require('../middlewares/auth');

router.get('/', auth, getSaved);
router.post('/', auth, saveItem);
router.get('/check/:itemType/:itemId', auth, checkSaved);
router.delete('/:itemType/:itemId', auth, unsaveItem);

module.exports = router;
