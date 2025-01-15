const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {strengthSessionController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('user'), strengthSessionController.logSession);

router.get('/', firebaseAuth('user'), strengthSessionController.getMySessions);

router.get("/get/session/byDate/:exerciseId", firebaseAuth('user'), strengthSessionController.getSessionByDate);

router.get('/last-best/:exerciseId', firebaseAuth('user'), strengthSessionController.getLastAndBestSession);

router.get('/maps/:exerciseId', firebaseAuth('user'), strengthSessionController.getStrengthMaps);

router.get('/maps/dated/:exerciseId', firebaseAuth('user'), strengthSessionController.getDatedStrengthMaps);

router.get('/weight/graph/:exerciseId', firebaseAuth('user'), strengthSessionController.getAvgWeightPerMonthByExcercize);
router.get('/newmap', firebaseAuth('user'), strengthSessionController.getDatedStrengthMap);

module.exports = router;
