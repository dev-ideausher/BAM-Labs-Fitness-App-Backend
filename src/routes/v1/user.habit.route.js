const express = require('express');

const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {userHabitController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('All'), userHabitController.createUserHabit);

router.get('/', firebaseAuth('All'), userHabitController.getUserHabits);
router.get('/habbit-stats', firebaseAuth('All'), userHabitController.getHabitStats);

router.get('/:userHabitId', firebaseAuth('All'), userHabitController.getUserHabit);

router.patch('/:userHabitId', firebaseAuth('All'), userHabitController.updateUserHabit);

router.delete('/:userHabitId', firebaseAuth('All'), userHabitController.deleteUserHabit);

router.post('/restore-streak/:userHabitId',firebaseAuth('All'), userHabitController.restoreHabitStreak);

module.exports = router;
