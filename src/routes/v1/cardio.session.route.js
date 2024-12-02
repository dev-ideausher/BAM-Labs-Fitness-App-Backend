const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {cardioSessionController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('user'), cardioSessionController.logSession);

router.get('/', firebaseAuth('user'), cardioSessionController.getMySessions);

router.get('/maps', firebaseAuth('user'), cardioSessionController.getCardioMaps);

router.get('/maps/dated', firebaseAuth('user'), cardioSessionController.getDatedCardioMaps);

module.exports = router;
