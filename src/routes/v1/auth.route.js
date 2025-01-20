const express = require('express');

const validate = require('../../middlewares/validate');
const {firebaseAuth, generateToken} = require('../../middlewares/firebaseAuth');
const {authValidation} = require('../../validations');
// const {fileUploadService} = require('../../microservices');

const {authController} = require('../../controllers');

const router = express.Router();

router.post('/login', firebaseAuth('All'), authController.loginUser);

router.post(
  '/register',
  firebaseAuth('user'),
  // fileUploadService.multerUpload.single('profilePic'),
  authController.registerUser
);

router.post(
  '/admin-secretSignup',
  validate(authValidation.register),
  firebaseAuth('admin'),
  authController.registerUser
);

router.post(
  '/register-user',
  validate(authValidation.registeruserValidation),
  authController.registerUserFromAdmin
);

router.post('/generate-token/:uid', generateToken);

module.exports = router;
