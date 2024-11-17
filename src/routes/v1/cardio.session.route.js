const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {cardioSessionController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('User'), cardioSessionController.logSession);

router.get('/', firebaseAuth('User'), cardioSessionController.getMySessions);

router.get('/maps', firebaseAuth('User'), cardioSessionController.getCardioMaps);

module.exports = router;
