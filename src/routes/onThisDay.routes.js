const router = require('express').Router();
const { getOnThisDay } = require('../controllers/onThisDay.controller');
const { auth } = require('../middlewares/auth');

router.get('/', auth, getOnThisDay);

module.exports = router;
