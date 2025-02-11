const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {userService} = require('../services');
const mongoose = require('mongoose');
const {getPaginateConfig} = require('../utils/queryPHandler');
const {userNotification} = require('../models/userNotification.model');

const {StrengthExercise, StrengthSession, CardioSession, StretchSession,PrimaryCategory,TargetedMuscle} = require('../models');

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
  console.log(req.user);
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
  const {weight, height, age} = req.body;

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

const getTodayStats = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [cardioCount, stretchCount, strengthSessions, strengthSessionExercises] = await Promise.all([
    CardioSession.countDocuments({
      userId,
      dateTime: {$gte: today, $lt: tomorrow},
    }),
    StretchSession.countDocuments({
      userId,
      dateTime: {$gte: today, $lt: tomorrow},
    }),
    StrengthSession.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          dateTime: {$gte: today, $lt: tomorrow},
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: {$sum: 1},
          investmentHours: {$sum: '$sessionTime'},
        },
      },
    ]),
    StrengthSession.find({
      userId,
      dateTime: {$gte: today, $lt: tomorrow},
    }).select('exerciseId'),
  ]);
  const exerciseIds = [...new Set(strengthSessionExercises.map(s => s.exerciseId))];
  const targetedMuscles = await StrengthExercise.find({
    _id: {$in: exerciseIds},
  }).populate('targetedMuscle', 'targetedMuscle');
  const uniqueMuscleNames = [...new Set(targetedMuscles.map(exercise => exercise.targetedMuscle.targetedMuscle))];

  const totalInvestmentHours = strengthSessions.length > 0 ? strengthSessions[0].investmentHours : 0;

  res.status(200).send({
    status: true,
    data: {
      investmentHours: totalInvestmentHours,
      stretchSessionCount: stretchCount,
      cardioSessionCount: cardioCount,
      strengthSessionCount: strengthSessions.length > 0 ? strengthSessions[0].totalSessions : 0,
      targetedMuscles: uniqueMuscleNames,
    },
    message: "Today's statistics fetched successfully",
  });
});

const getPracticeStats = catchAsync(async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = 'strength' } = req.query;
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    let Model;
    switch (type.toLowerCase()) {
      case 'stretch':
        Model = StretchSession;
        break;
      case 'cardio':
        Model = CardioSession;
        break;
      case 'strength':
        Model = StrengthSession;
        break;
      default:
        throw new Error('Invalid session type');
    }
    const totalPracticeDays = await Model.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateTime" }
          }
        }
      },
      {
        $count: "totalDays"
      }
    ]);
    const monthPracticeDays = await Model.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          dateTime: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth - 1, daysInMonth)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateTime" }
          }
        }
      },
      {
        $count: "monthDays"
      }
    ]);
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const monthDays = monthPracticeDays[0]?.monthDays || 0;
    const sessionRate = ((monthDays / daysInCurrentMonth) * 100).toFixed(2);

    let response = {
      totalPracticeDays: totalPracticeDays[0]?.totalDays || 0,
      monthPracticeDays: monthDays,
      sessionRate: parseFloat(sessionRate)
    };

    if (type.toLowerCase() === 'strength') {
      const mostTargetedMuscle = await StrengthSession.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId)
          }
        },
        {
          $lookup: {
            from: 'strengthexercises',
            localField: 'exerciseId',
            foreignField: '_id',
            as: 'exercise'
          }
        },
        {
          $unwind: '$exercise'
        },
        {
          $lookup: {
            from: 'targetedmuscles',
            localField: 'exercise.targetedMuscle',
            foreignField: '_id',
            as: 'muscleDetails'
          }
        },
        {
          $unwind: '$muscleDetails'
        },
        {
          $group: {
            _id: {
              muscleId: '$muscleDetails._id',
              muscleName: '$muscleDetails.targetedMuscle'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 1
        }
      ]);
      response.mostTargetedMuscle = mostTargetedMuscle[0]?._id.muscleName || null;
    }
    
    res.status(200).send({
      status: true,
      data: response,
      message: "Practice statistics fetched successfully"
    });

  } catch (error) {
    console.error('Error fetching practice stats:', error);
    res.status(500).send({
      status: false,
      message: "Failed to fetch practice statistics",
      error: error.message
    });
  }
});

const getExerciseStats = catchAsync(async (req, res) => {
  const { primaryExercise } = req.query;
  const userId = req.user._id;
  const primaryCategory = await PrimaryCategory.findOne({
    categoryName: primaryExercise,
    isDeleted: false
  });

  if (!primaryCategory) {
    return res.status(404).json({ message: 'Primary exercise category not found' });
  }

  const exercises = await StrengthExercise.find({
    primaryCategory: primaryCategory._id,
    isDeleted: false,
  });

  const exerciseIds = exercises.map((ex) => ex._id);
  const sessions = await StrengthSession.find({
    userId,
    exerciseId: { $in: exerciseIds },
    dateTime: {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  const totalSessions = sessions.length;
  const totalWeight = sessions.reduce((sum, session) => sum + session.weight, 0);
  const avgWeight = totalSessions > 0 ? totalWeight / totalSessions : 0;
  const totalReps = sessions.reduce((sum, session) => sum + session.reps, 0);
  const exerciseFrequency = {};
  sessions.forEach((session) => {
    exerciseFrequency[session.exerciseId] =
      (exerciseFrequency[session.exerciseId] || 0) + 1;
  });

  let favoriteExerciseId = null;
  let maxFrequency = 0;

  Object.entries(exerciseFrequency).forEach(([exerciseId, frequency]) => {
    if (frequency > maxFrequency) {
      maxFrequency = frequency;
      favoriteExerciseId = exerciseId;
    }
  });

  const favoriteExercise = favoriteExerciseId
    ? await StrengthExercise.findById(favoriteExerciseId)
    : null;

  const muscleFrequency = {};
  for (const exercise of exercises) {
    const sessionCount = sessions.filter(
      (s) => s.exerciseId.toString() === exercise._id.toString()
    ).length;

    if (sessionCount > 0) {
      muscleFrequency[exercise.targetedMuscle] =
        (muscleFrequency[exercise.targetedMuscle] || 0) + sessionCount;
    }
  }

  let favoriteMuscleId = null;
  maxFrequency = 0;

  Object.entries(muscleFrequency).forEach(([muscleId, frequency]) => {
    if (frequency > maxFrequency) {
      maxFrequency = frequency;
      favoriteMuscleId = muscleId;
    }
  });

  const favoriteMuscle = favoriteMuscleId
    ? await TargetedMuscle.findById(favoriteMuscleId)
    : null;

  return res.status(200).json({
    totalSessionsPerWeek: totalSessions,
    averageWeight: Math.round(avgWeight * 100) / 100,
    totalReps,
    favoriteExercise: favoriteExercise ? favoriteExercise.exerciseName : null,
    favoriteMuscle: favoriteMuscle ? favoriteMuscle.targetedMuscle : null,
  });
});

const getAllNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { read, page = 1, limit = 10 } = req.query;
  const limitNumber = Number(limit);
  const pageNumber = Math.max(1, Number(page));

  let filter = { userId, status: 'sent' };
  if (read !== undefined) {
    filter.read = read === 'true';
  }

  const initialCounts = {
    total: await userNotification.countDocuments({ userId, status: 'sent' }),
    read: await userNotification.countDocuments({ userId, status: 'sent', read: true }),
    unread: await userNotification.countDocuments({ userId, status: 'sent', read: false })
  };

  let currentFilterCount;
  if (read === 'true') {
    currentFilterCount = initialCounts.read;
  } else if (read === 'false') {
    currentFilterCount = initialCounts.unread;
  } else {
    currentFilterCount = initialCounts.total;
  }

  let totalPages = Math.ceil(currentFilterCount / limitNumber) || 1;
  if (pageNumber > totalPages) {
    return res.status(200).json({
      status: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: [],
        counts: initialCounts,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          limit: limitNumber
        }
      }
    });
  }

  const notifications = await userNotification
    .find(filter)
    .sort({ timestamp: -1 })
    .select('title body status read timestamp')
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  let finalCounts = { ...initialCounts };
  if (read === 'false' && initialCounts.unread > 0) {
    const notificationIds = notifications
      .filter(notif => !notif.read)
      .map(notif => notif._id);

    if (notificationIds.length > 0) {
      await userNotification.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { read: true } }
      );

      finalCounts = {
        total: initialCounts.total,
        read: initialCounts.read + notificationIds.length,
        unread: initialCounts.unread - notificationIds.length
      };

      currentFilterCount = finalCounts.unread;
      totalPages = Math.ceil(currentFilterCount / limitNumber) || 1;
    }
  }

  res.status(200).json({
    status: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications,
      counts: finalCounts,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        limit: limitNumber
      }
    }
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
  getTodayStats,
  getPracticeStats,
  getExerciseStats,
  getAllNotifications
};
