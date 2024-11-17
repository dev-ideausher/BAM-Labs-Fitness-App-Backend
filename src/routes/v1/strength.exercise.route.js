const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {strengthExerciseController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('User'), strengthExerciseController.createExercise);

router.post('/custom', firebaseAuth('User'), strengthExerciseController.createCustomExercise);

router.get('/', firebaseAuth('User'), strengthExerciseController.getAllExercises);

module.exports = router;
