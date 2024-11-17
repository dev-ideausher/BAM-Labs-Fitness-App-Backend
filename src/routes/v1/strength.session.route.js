const express = require('express');

// const validate = require('../../middlewares/validate');
const firebaseAuth = require('../../middlewares/firebaseAuth');
const {strengthSessionController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('User'), strengthSessionController.logSession);

router.get('/', firebaseAuth('User'), strengthSessionController.getMySessions);

router.get('/last-best', firebaseAuth('User'), strengthSessionController.getLastAndBestSession);

router.get('/maps/:exerciseId', firebaseAuth('User'), strengthSessionController.getStrengthMaps);

module.exports = router;
