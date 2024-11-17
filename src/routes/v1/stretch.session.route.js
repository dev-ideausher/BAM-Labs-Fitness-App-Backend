const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {stretchSessionController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('user'), stretchSessionController.logSession);

router.get('/', firebaseAuth('user'), stretchSessionController.getMySessions);

router.get('/maps', firebaseAuth('user'), stretchSessionController.getStretchMaps);

module.exports = router;
