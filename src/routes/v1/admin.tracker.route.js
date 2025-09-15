const express = require('express');
const { trackerController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');
const validate = require('../../middlewares/validate');
const { strengthContentValidation } = require('../../validations')

const router = express.Router();

router.get('/strength-content', authenticate, trackerController.getStrengthContent);
router.get('/habits', authenticate, trackerController.getAllHabits);
router.post('/habits', trackerController.createNewHabit);
router.patch('/habits/:id', authenticate, trackerController.updateHabit);
router.delete('/habits/:id', authenticate, trackerController.deleteHabit);

router.post('/strength-content', authenticate,validate(strengthContentValidation.createStrengthContentValidation), trackerController.createStrengthContent);
router.get('/category/:id', authenticate, trackerController.getSpecificCategory);

router.patch('/update/muscle/', authenticate, validate(strengthContentValidation.updateMuscleExcerciseValidation), trackerController.updateMuscleExcercise);
router.put("/delete/muscle/:id", authenticate, trackerController.deleteMuscle);
router.put("/delete/excercise/:id", authenticate, trackerController.deleteExcercise);
router.put("/delete/:id", authenticate, trackerController.deleteStrengthContent);
router.post('/muscle/exercise', authenticate ,validate(strengthContentValidation.addExerciseValidation), trackerController.addExerciseForMuscle);
router.post('/add-muscle', authenticate,validate(strengthContentValidation.addMuscleValidation), trackerController.addMuscleToPrimaryCategory);

// content management part for updating video only

router.put('/update/video/:excerciseId', authenticate, validate(strengthContentValidation.updateVideoValidation), trackerController.updateVideo);
module.exports = router;
