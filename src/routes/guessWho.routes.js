const router = require('express').Router();
const {
  createChallenge, getActive, getRevealed, getOne, deleteChallenge,
  makeGuess, getGuesses, getMyUploads,
} = require('../controllers/guessWho.controller');
const { auth, optionalAuth } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const { createChallengeValidation, makeGuessValidation } = require('../validations/guessWho.validation');

router.get('/active', auth, getActive);
router.get('/revealed', auth, getRevealed);
router.get('/my-uploads', auth, getMyUploads);
router.post('/', auth, upload.array('photo', 1), createChallengeValidation, validate, createChallenge);
router.get('/:id', optionalAuth, getOne);
router.delete('/:id', auth, deleteChallenge);
router.post('/:id/guess', auth, makeGuessValidation, validate, makeGuess);
router.get('/:id/guesses', auth, getGuesses);

module.exports = router;
