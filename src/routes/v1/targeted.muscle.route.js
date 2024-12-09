const express = require('express');

const {firebaseAuth} = require('../../middlewares/firebaseAuth');

const {targetedMuscleController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('admin'), targetedMuscleController.createTargetedMuscle);

router.get('/', firebaseAuth('All'), targetedMuscleController.getAllTargetedMuscles);

router.get('/:targetedMuscleId', firebaseAuth('user'), targetedMuscleController.getTargetedMuscleById);

router.patch('/:targetedMuscleId', firebaseAuth('admin'), targetedMuscleController.updateTargetedMuscleById);

router.delete('/:targetedMuscleId', firebaseAuth('admin'), targetedMuscleController.deleteTargetedMuscleById);

module.exports = router;
