const httpStatus = require('http-status');
const {userService} = require('../services');
const catchAsync = require('../utils/catchAsync');
// const ApiError = require("../utils/ApiError");
const {getPaginateConfig} = require('../utils/queryPHandler');
const ApiError = require('../utils/ApiError');
const {User} = require('../models');
const mongoose = require('mongoose');
const {StretchSession, CardioSession, StrengthSession} = require('../models');

const getUsers = catchAsync(async (req, res) => {
  const {type} = req.params;
  const {search,isBlocked, isDeleted} = req.query;
  const {filters, options} = getPaginateConfig(req.query);
  options.project = {
    _id: 1,
    name: 1,
    email: 1,
    phone: 1,
    firebaseUid: 1,
    createdAt: 1,
    gender: 1,
    isEmailVerified: 1,
    isPhoneVerified: 1,
    isBlocked: 1,
    isDeleted: 1,
  };

  if (!type) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide a type');
  }
  if (type === 'overview') {
    filters.isEmailVerified = true;
    filters.isPhoneVerified = true;
  } else if (type === 'management') {
    filters['$or'] = [{isPhoneVerified: false}, {isEmailVerified: false}];
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid type');
  }

  if (isBlocked !== undefined) {
    filters.isBlocked = isBlocked === 'true';
  }

  if (isDeleted !== undefined) {
    filters.isDeleted = isDeleted === 'true';
  }

  if (search) {
    if (filters.$or) {
      
      filters.$and = [
        { $or: filters.$or },
        { $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]}
      ];
      delete filters.$or;
    } else {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
  }

  const sort = {[options.sortBy]: options.sortOrder === 'asc' ? 1 : -1};
  console.log(filters);
  const users = await userService.getUsers(filters, options);
  res.status(httpStatus.OK).send({data: users, message: 'Users fetched successfully', status: true});
});

const verifyUser = catchAsync(async (req, res) => {
  const {userId} = req.params;
  const {verifyType} = req.query;

  if (!verifyType || !['email', 'phone'].includes(verifyType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid verifyType. Must be "email" or "phone".');
  }

  const updateData = {};
  if (verifyType === 'email') {
    updateData.isEmailVerified = true;
  } else if (verifyType === 'phone') {
    updateData.isPhoneVerified = true;
  }

  const user = await User.findByIdAndUpdate(userId, updateData, {new: true});

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  res.status(httpStatus.OK).send({
    status: true,
    message: `User's ${verifyType} verified successfully`,
    data: user,
  });
});
const modifyUserStatus = catchAsync(async (req, res) => {
  const {userId} = req.params;
  const {action} = req.query;

  if (!action || !['block', 'softDelete'].includes(action)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid action. Must be "block" or "softDelete".');
  }
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const updateData = {};
  if (action === 'block') {
    updateData.isBlocked = !user.isBlocked;
  } else if (action === 'softDelete') {
    updateData.isDeleted = !user.isDeleted;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {new: true});

  res.status(httpStatus.OK).send({
    status: true,
    message: `User ${action} status changed successfully`,
    data: updatedUser,
  });
});

const getUserDetails = catchAsync(async (req, res) => {
  const {userId} = req.params;

  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid userId format');
  }

  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  res.status(httpStatus.OK).send({
    status: true,
    message: 'User details fetched successfully',
    data: user,
  });
});
const getsessionDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const [cardioSessions, strengthSessions, stretchSessions] = await Promise.all([
      CardioSession.find({ userId })
        .select('dateTime createdAt')
        .sort({ dateTime: -1 })
        .lean(),
      StrengthSession.find({ userId })
        .select('dateTime createdAt')
        .sort({ dateTime: -1 })
        .lean(),
      StretchSession.find({ userId })
        .select('dateTime createdAt')
        .sort({ dateTime: -1 })
        .lean()
    ]);
    const allSessions = [
      ...cardioSessions.map(session => ({
        sessionName: 'Cardio',
        sessionDate: session.dateTime,
        timestamp: session.createdAt,
      })),
      ...strengthSessions.map(session => ({
        sessionName: 'Strength',
        sessionDate: session.dateTime,
        timestamp: session.createdAt,
      })),
      ...stretchSessions.map(session => ({
        sessionName: 'Stretch',
        sessionDate: session.dateTime,
        timestamp: session.createdAt,
      }))
    ];
    allSessions.sort((a, b) => b.sessionDate - a.sessionDate);
    const totalResults = allSessions.length;
    const totalPages = Math.ceil(totalResults / parsedLimit);
    const paginatedSessions = allSessions.slice(skip, skip + parsedLimit);

    const response = {
      status: true,
      data: {
        page: parsedPage,
        limit: parsedLimit,
        results: paginatedSessions,
        totalResults,
        totalPages,
      },
      message: 'User session details fetched successfully',
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Error fetching user details',
      error: error.message,
    });
  }
};

module.exports = {
  getUsers,
  verifyUser,
  modifyUserStatus,
  getUserDetails,
  getsessionDetails,
};
