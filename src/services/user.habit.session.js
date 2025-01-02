const httpStatus = require('http-status');
const { UserHabit } = require('../models');
const { UserHabitLog } = require('../models/userHabitLog.model');
const ApiError = require('../utils/ApiError');
const {  getMapsByDateForHabitLog } = require('../utils/getMaps');

const createUserHabitLog = async (data) => {
  const userHabit = await UserHabit.findById(data.userHabitId);
  if (!userHabit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User habit not found');
  }

  const now = new Date();
  let timeStart;

  // Determine the start of the date range based on taskType
  if (userHabit.taskType === 'daily') {
    timeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of the day
  } else if (userHabit.taskType === 'weekly') {
    const weekStart = now.getDate() - now.getDay(); // Start of the week (Sunday)
    timeStart = new Date(now.setDate(weekStart));
  } else if (userHabit.taskType === 'monthly') {
    timeStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported task type');
  }

  // Fetch the habit log within the relevant time range
  const habitLog = await UserHabitLog.findOne({
    userHabitId: data.userHabitId,
    dateTime: { $gte: timeStart, $lt: now },
    status: 'completed',
  });

  // Handle the taskDays logic for specific-weekdays, weekly-count, or monthly-count
  if (userHabit.taskType === 'weekly' && userHabit.taskDays === 'specific-weekdays') {
    const currentDay = now.getDay();
    if (!userHabit.specificWeekdays.includes(currentDay)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'This habit is not scheduled for today');
    }
  }

  // Create a new log or update the counterForDay
  if (!habitLog) {
    return await UserHabitLog.create(data);
  }
  if (habitLog.counterForDay >= userHabit.numberOfTimes) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Done for the day: You can log this habit again tomorrow'
    );
  }

  habitLog.counterForDay += 1;
  return await habitLog.save();
};

const getDatedHabitLogs = async (userHabitId, startDate, endDate) => {
    return getMapsByDateForHabitLog(UserHabitLog, {userHabitId}, startDate, endDate);
}

const getHabitCompletionCount = async (habitId, userId) => {
  try {
    // Fetch the UserHabit document
    const userHabit = await UserHabit.findOne({habitId: habitId, userId:userId});
    if (!userHabit) {
      throw new Error('UserHabit not found');
    }

    const {  taskType } = userHabit;

    // Define the start date range based on `taskType`
    const now = new Date();
    let startDate;

    switch (taskType) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;

      case 'weekly':
        { const weekStart = now.getDate() - now.getDay(); 
        startDate = new Date(now.setDate(weekStart));
        break; }

      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
        break;

      default:
        throw new Error('Unsupported taskType');
    }

    // Query the UserHabitLog within the calculated date range
    const habitLog = await UserHabitLog.findOne({
      userHabitId:userHabit._id,
      dateTime: { $gte: startDate, $lt: now },
    });
    console.log(userHabit._id)
    // If no log exists for the specified range, return zero
    const completedCount = habitLog ? habitLog.counterForDay : 0;

    return completedCount
  } catch (error) {
    console.error('Error fetching habit completion count:', error.message);
    throw new ApiError(500, "Error in calculating the no of times habit performed");
  }
};


module.exports = {
  createUserHabitLog,
  getDatedHabitLogs,
  getHabitCompletionCount
};
