const httpStatus = require('http-status');
const {userHabitService, userHabitLogService} = require('../services');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const validateHabitData = reqBody => {
  const {taskType, taskDays, specificWeekdays, weeklyCount, monthlyCount, numberOfTimes, customTimes} = reqBody;

  // Initialize a new habit object to return
  const validHabit = {
    userId: reqBody.userId,
    habitId: reqBody.habitId,
    taskType,
    taskDays,
    numberOfTimes,
    customTimes,
    notificaions: reqBody.notifications,
    customReminder: reqBody.customReminder,
  };

  // Validate taskType and taskDays consistency
  if (taskType === 'daily') {
    if (taskDays === 'everyday') {
      // Allow everyday for daily taskType, nothing else needed
    } else if (taskDays === 'specific-weekdays') {
      if (!Array.isArray(specificWeekdays) || specificWeekdays.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'specificWeekdays must be a non-empty array.');
      }
      // Ensure specificWeekdays are unique and within valid range (0-6)
      const uniqueWeekdays = [...new Set(specificWeekdays)];
      if (uniqueWeekdays.length !== specificWeekdays.length || uniqueWeekdays.some(day => day < 0 || day > 6)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'specificWeekdays must contain unique numbers between 0 and 6.');
      }
      validHabit.specificWeekdays = specificWeekdays;
    } else {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'For daily taskType, taskDays must be "everyday" or "specific-weekdays".'
      );
    }
  } else if (taskType === 'weekly') {
    if (taskDays === 'weekly-count') {
      if (typeof weeklyCount !== 'number' || weeklyCount <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'weeklyCount must be a positive number.');
      }
      validHabit.weeklyCount = weeklyCount;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'For weekly taskType, taskDays must be "weekly-count".');
    }
  } else if (taskType === 'monthly') {
    if (taskDays === 'monthly-count') {
      if (typeof monthlyCount !== 'number' || monthlyCount <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'monthlyCount must be a positive number.');
      }
      validHabit.monthlyCount = monthlyCount;
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'For monthly taskType, taskDays must be "monthly-count".');
    }
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid taskType. Allowed values are "daily", "weekly", or "monthly".');
  }

  // Validate numberOfTimes and customTimes for consistency
  if (customTimes && customTimes.length !== numberOfTimes) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'customTimes length must be equal to numberOfTimes.');
  }

  if (customTimes && customTimes.some(time => !/^[0-2][0-9]:[0-5][0-9]$/.test(time))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Each time in customTimes must be in proper 24-hour HH:MM format.');
  }

  // Add optional fields
  return validHabit;
};

const createUserHabit = catchAsync(async (req, res) => {
  const validHabit = await validateHabitData({...req.body, userId: req.user._id});
  const habit = await userHabitService.createUserHabit(validHabit);
  res.status(200).json({
    status: true,
    message: 'User habit created successfully',
    habit,
  });
});

const getUserHabit = catchAsync(async (req, res) => {
  const habit = await userHabitService.getUserHabit(req.params.userHabitId);
  if (!habit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User habit not found');
  }
  res.status(200).json({
    status: true,
    message: 'User habit retrieved successfully',
    habit,
  });
});

const getUserHabits = catchAsync(async (req, res) => {
  const habits = await userHabitService.getUserHabits(req.user._id, req.query, [{path: 'habitId'}]);
  console.log(habits)
  const enrichedHabits = await Promise.all(
    habits.results.map(async (data) => {
      const habitPerformed = await userHabitLogService.getHabitCompletionCount(data.habitId, req.user._id);
      return { ...data, habitPerformed }; // Use `toObject` to convert Mongoose objects if needed
    })
  );
  res.status(200).json({
    status: true,
    message: 'User habits retrieved successfully',
    habits:enrichedHabits,
  });
});

const updateUserHabit = catchAsync(async (req, res) => {
  const validHabit = await validateHabitData(req.body);
  const habit = await userHabitService.updateUserHabit(req.params.userHabitId, validHabit);
  res.status(200).json({
    status: true,
    message: 'User habit updated successfully',
    habit,
  });
});

const deleteUserHabit = catchAsync(async (req, res) => {
  await userHabitService.deleteUserHabit(req.params.userHabitId);
  res.status(200).json({
    status: true,
    message: 'User habit deleted successfully',
  });
});

module.exports = {
  createUserHabit,
  getUserHabit,
  getUserHabits,
  updateUserHabit,
  deleteUserHabit,
};
