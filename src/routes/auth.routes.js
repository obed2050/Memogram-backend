const router = require('express').Router();
const { register, login, logout, getMe } = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { registerValidation, loginValidation } = require('../validations/auth.validation');

console.log('✅ [Auth Routes] Registering: POST /register, POST /login, POST /logout, GET /me');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);

module.exports = router;
