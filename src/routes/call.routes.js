const router = require('express').Router();
const { auth } = require('../middlewares/auth');
const callController = require('../controllers/call.controller');

router.get('/history', auth, callController.getCallHistory);
router.get('/missed', auth, callController.getMissedCalls);

module.exports = router;
