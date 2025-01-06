const express = require('express');

const validate = require('../../middlewares/validate');
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const userValidation = require('../../validations/user.validation');

const {userController} = require('../../controllers');
// const {fileUploadService} = require('../../microservices');

const router = express.Router();

router.get('/', firebaseAuth('All'), userController.getAllUsers);

router.get('/:id', firebaseAuth('All'), userController.getUserbyId);

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

module.exports = router;
