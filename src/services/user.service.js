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
  if (newDetails?.age !== undefined) {
    const currentAge = user.age;
    if (currentAge && Math.abs(currentAge - newDetails.age) > 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Age change exceeds reasonable limit. Please contact support if this is incorrect.'
      );
    }
    user.age = newDetails.age;
    let birthMonth = user.dob ? user.dob.getUTCMonth() : 0;
    let birthDay = user.dob ? user.dob.getUTCDate() : 1;

    const today = new Date();
    const birthYear = today.getUTCFullYear() - newDetails.age;
    user.dob = new Date(Date.UTC(birthYear, birthMonth, birthDay));
  } else if (user.dob) {
    user.age = calculateAge(user.dob);
  }
  recalculateMetrics(user);

  const saved = await user.save();
  return saved;
}
function calculateAge(dob) {
  const currentDate = new Date();
  const birthDate = new Date(dob);
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDifference = currentDate.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function recalculateMetrics(user) {
  if (user.weight && user.height) {
    const heightInMeters = user.height / 100;
    user.bmi = user.weight / heightInMeters ** 2;
  } else {
    user.bmi = null;
  }

  if (user.gender && user.bmi && user.age) {
    if (user.gender === 'male') {
      user.bodyFat = 1.2 * user.bmi + 0.23 * user.age - 16.2;
    } else if (user.gender === 'female') {
      user.bodyFat = 1.2 * user.bmi + 0.23 * user.age - 5.4;
    } else if (user.gender === 'other') {
      user.bodyFat = 1.2 * user.bmi + 0.23 * user.age - 10.8;
    } else {
      user.bodyFat = null;
    }
  } else {
    user.bodyFat = null;
  }
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
