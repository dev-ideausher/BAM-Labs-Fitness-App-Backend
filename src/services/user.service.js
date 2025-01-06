const {User} = require('../models');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const userValidator = user => {
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
  } else if (user.isDeleted) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User account has been deleted.');
  } else if (user.isBlocked) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has been blocked.');
  }
};

async function getUserById(id) {
  const user = await User.findById(id);
  userValidator(user);
  return user;
}

async function getUsers(filters, options) {
  return await User.paginate(filters, options);
}

async function updateUserById(id, newDetails) {
  const user = await User.findById(id);
  userValidator(user);
  user.bodyImage = newDetails?.bodyImage && newDetails.bodyImage.length > 0 ? newDetails.bodyImage : user.bodyImage;
  user.profilePic = newDetails?.profilePic ? newDetails.profilePic : user.profilePic;
  user.dob = newDetails?.dob ? newDetails.dob : user.dob;
  user.phone = newDetails?.phone ? newDetails.phone : user.phone;
  user.email = newDetails?.email ? newDetails.email : user.email;
  user.name = newDetails?.name ? newDetails.name : user.name;
  user.gender = newDetails?.gender ? newDetails.gender : user.gender;
  user.weight = newDetails?.weight ? newDetails.weight : user.weight;
  user.height = newDetails?.height ? newDetails.height : user.height;
  const saved =await user.save();
  return saved;

}

async function deleteUserById(id) {
  try {
    await User.findByIdAndDelete(id);
    return true;
  } catch (err) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete the user');
  }
}

async function updatePreferencesById(id, newPrefs) {
  const user = await User.findById(id);
  user.preferences = {
    ...user.preferences,
    ...newPrefs,
  };
  // any other fields if you have
  await user.save();
  return user;
}

module.exports = {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  updatePreferencesById,
};
