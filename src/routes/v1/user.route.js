const express = require('express');

const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const userValidation = require('../../validations/user.validation');

const {userController} = require('../../controllers');
// const {fileUploadService} = require('../../microservices');
const {workoutReminderController} = require('../../controllers');

const router = express.Router();

router.get('/', firebaseAuth('All'), userController.getAllUsers);

router.get('/me', firebaseAuth('All'), userController.getUserbyId);
router
  .route('/reminder')
  .post(firebaseAuth('All'), workoutReminderController.createWorkoutReminder)
  .get(firebaseAuth('All'), workoutReminderController.getMyReminder)
  .delete(firebaseAuth('All'), workoutReminderController.deleteWorkoutReminder);

// for updating userDetails
router.patch(
  '/updateDetails',
  firebaseAuth('user'),
  userController.updateUser
);

// for updating specific user preferences
router.patch(
  '/updatePreferences',
  validate(userValidation.updateUserPreferences),
  firebaseAuth('All'),
  userController.updatePreferences
);

// for deleting a user
router.delete('/:userId', validate(userValidation.deleteUser), firebaseAuth('admin'), userController.deleteUser);

// to soft delete a user
router.post('/delete/:userId', validate(userValidation.deleteUser), firebaseAuth('All'), userController.softDeleteUser);
router.patch('/metrics', firebaseAuth('All'), userController.updateUserMetrics);
router.get('/today-stats', firebaseAuth('All'), userController.getTodayStats);
router.get('/practice-stats', firebaseAuth('All'),userController.getPracticeStats);
router.get('/exercise-stats', firebaseAuth('All'),userController.getExerciseStats);
router.get('/all-notifications', firebaseAuth('All'), userController.getAllNotifications);

module.exports = router;
