const {authService, userService} = require('../services');
const catchAsync = require('../utils/catchAsync');
const admin = require('firebase-admin');
const {sendEmail} = require('../microservices/mail.service');
const { getWelcomeEmailTemplate } = require('../microservices/emailTemplates.service');

const createNewUserObject = newUser => ({
  email: newUser.email,
  firebaseUid: newUser.uid,
  // profilePic: {
  //   key: newUser.picture,
  //   url: newUser.picture,
  // },
  isEmailVerified: newUser.isEmailVerified,

  firebaseSignInProvider: newUser.firebase.sign_in_provider,
});

const loginUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  res.status(200).send({data: user});
});

const registerUser = catchAsync(async (req, res) => {
  if (req.user) {
    res.status(401).send({message: 'User already exist'});
    // } else if (!req.newUser.email_verified) {
    //   res.status(401).send({ message: "Email not verified" });
  } else {
    const obj = createNewUserObject(req.newUser);

    const userObj = {
      ...obj,
      ...req.body,
      role: req.routeType,
    };
    const user = await authService.createUser(userObj);
    res.status(201).send({data: user});
  }
});

const registerUserFromAdmin = catchAsync(async (req, res) => {
  const { email, password, role, ...otherDetails } = req.body;

  try {
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      emailVerified: true,
      disabled: false,
    });

    await admin.auth().setCustomUserClaims(firebaseUser.uid, {
      role: role || 'user',
    });

    const userObj = {
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      role: role || 'user',
      firebaseSignInProvider: 'password',
      isEmailVerified: true,
      ...otherDetails,
    };

    const newUser = await authService.createUser(userObj);

    const emailData = {
      to: email,
      subject: 'Welcome to [Your Platform Name]',
      html: getWelcomeEmailTemplate({
        name: otherDetails.name,
        email,
        password,
      }),
    };

    await sendEmail(emailData);

    return res.status(201).send({
      status: true,
      data: newUser,
      message: 'User registered successfully, credentials sent via email',
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: error.message,
    });
  }
});

module.exports = {
  loginUser,
  registerUser,
  registerUserFromAdmin,
};
