const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {strengthExerciseController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('user'), strengthExerciseController.createExercise);

router.post('/custom', firebaseAuth('user'), strengthExerciseController.createCustomExercise);

router.get('/', firebaseAuth('user'), strengthExerciseController.getAllExercises);

module.exports = router;
