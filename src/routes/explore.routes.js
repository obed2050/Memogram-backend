const router = require('express').Router();
const { getExplore } = require('../controllers/explore.controller');
const { auth } = require('../middlewares/auth');

router.get('/', auth, getExplore);

module.exports = router;
