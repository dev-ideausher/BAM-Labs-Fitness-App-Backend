const {authService, userService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const createNewUserObject = newUser => ({
  email: newUser.email,
  firebaseUid: newUser.uid,
  profilePic: newUser.picture,
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
    const obj = await createNewUserObject(req.newUser);

    const userObj = {
      ...obj,
      ...req.body,
      role: req.routeType,
    };
    const user = await authService.createUser(userObj);
    res.status(201).send({data: user});
  }
});

module.exports = {
  loginUser,
  registerUser,
};
