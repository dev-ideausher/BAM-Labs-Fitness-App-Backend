const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {userService} = require('../services');

const getAllUsers = catchAsync(async (req, res) => {
  const users = await userService.getUsers(req.query, {});
  res.status(200).send({data: users});
});

const getUserbyId = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.user._id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.status(200).send({data: user});
});

const updateUser = catchAsync(async (req, res) => {
  console.log(req.user)
  const updatedUser = await userService.updateUserById(req.user._id, req.body);
  res.status(200).send({data: updatedUser, message: 'Your details are updated'});
});

const updatePreferences = catchAsync(async (req, res) => {
  const updatedUser = await userService.updatePreferencesById(req.user._id, req.body);
  res.status(200).send({data: updatedUser, message: 'Your preferences are updated'});
});

const softDeleteUser = catchAsync(async (req, res) => {
  const {userId} = req.params;
  if (req.user.__t !== 'Admin' && userId !== req.user._id.toString()) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Sorry, you are not authorized to do this');
  }
  await userService.markUserAsDeletedById(req.params.userId);
  res.status(200).send({
    message: 'User has been removed successfully.',
  });
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(200).send({message: 'The user deletion process has been completed successfully.'});
});

const updateUserMetrics = catchAsync(async (req, res) => {
  const { weight, height, age } = req.body;

  if (age !== undefined) {
    if (typeof age !== 'number' || !Number.isInteger(age)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Age must be a whole number');
    }
    if (age < 10 || age > 120) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Age must be between 10 and 120 years');
    }
  }
  const updatedUser = await userService.updateUserById(req.user._id, {
    weight,
    height,
    age,
  });
  if (!updatedUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.status(httpStatus.OK).send({
    status: true,
    data: updatedUser,
    message: 'User metrics updated successfully',
  });
});


module.exports = {
  getAllUsers,
  getUserbyId,
  deleteUser,
  updateUser,
  softDeleteUser,
  updatePreferences,
  updateUserMetrics,
};
