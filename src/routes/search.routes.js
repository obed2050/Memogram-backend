const router = require('express').Router();
const { search } = require('../controllers/search.controller');
const { auth } = require('../middlewares/auth');

router.get('/', auth, search);

module.exports = router;
