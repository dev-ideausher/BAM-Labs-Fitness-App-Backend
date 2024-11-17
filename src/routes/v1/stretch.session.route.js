const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {stretchSessionController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('User'), stretchSessionController.logSession);

router.get('/', firebaseAuth('User'), stretchSessionController.getMySessions);

router.get('/maps', firebaseAuth('User'), stretchSessionController.getStretchMaps);

module.exports = router;
