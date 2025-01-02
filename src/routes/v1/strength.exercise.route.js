const express = require('express');

// const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {strengthExerciseController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('admin'), strengthExerciseController.createExercise);

router.get('/:id', firebaseAuth('user'), strengthExerciseController.getExerciseById);

router.post('/custom', firebaseAuth('user'), strengthExerciseController.createCustomExercise);

router.get('/', firebaseAuth('All'), strengthExerciseController.getAllExercises);

module.exports = router;
