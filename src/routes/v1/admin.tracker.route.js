const express = require('express');
const { trackerController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');
const validate = require('../../middlewares/validate');
const { strengthContentValidation } = require('../../validations');


const router = express.Router();

router.get('/strength-content', authenticate, trackerController.getStrengthContent);
router.get('/habits', authenticate, trackerController.getAllHabits);
router.post('/habits', authenticate, trackerController.createNewHabit);
router.patch('/habits/:id', authenticate, trackerController.updateHabit);
router.delete('/habits/:id', authenticate, trackerController.deleteHabit);

router.post('/strength-content', authenticate,validate(strengthContentValidation.createStrengthContentValidation), trackerController.createStrengthContent);
router.get('/category/:id', authenticate, trackerController.getSpecificCategory);
module.exports = router;
