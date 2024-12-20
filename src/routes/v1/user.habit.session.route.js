const express = require('express');

const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const { userHabitSessionController } = require('../../controllers');
const { habitValidation } = require('../../validations');


const router = express.Router();

router.post('/', firebaseAuth('user'), validate(habitValidation.userHabitLogSchema), userHabitSessionController.createLog);
router.get('/maps/dated/:userHabitId', firebaseAuth('user'), userHabitSessionController.getDatedHabitLogs);
// router.get('/maps/monthly/:userHabitId', firebaseAuth('user'), userHabitSessionController.getDatedHabitLogs);
module.exports = router;
