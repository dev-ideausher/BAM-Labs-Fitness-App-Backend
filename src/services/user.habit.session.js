const httpStatus = require('http-status');
const { UserHabit } = require('../models');
const { UserHabitLog } = require('../models/userHabitLog.model');
const ApiError = require('../utils/ApiError');
const {  getMapsByDateForHabitLog } = require('../utils/getMaps');

// const createUserHabitLog = async (data) => {
//   const userHabit = await UserHabit.findById(data.userHabitId);
//   if (!userHabit) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'User habit not found');
//   }

//   const now = new Date();
//   let timeStart;

//   // Determine the start of the date range based on taskType
//   if (userHabit.taskType === 'daily') {
//     timeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of the day
//   } else if (userHabit.taskType === 'weekly') {
//     const weekStart = now.getDate() - now.getDay(); // Start of the week (Sunday)
//     timeStart = new Date(now.setDate(weekStart));
//   } else if (userHabit.taskType === 'monthly') {
//     timeStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
//   } else {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported task type');
//   }

//   // Fetch the habit log within the relevant time range
//   const habitLog = await UserHabitLog.findOne({
//     userHabitId: data.userHabitId,
//     dateTime: { $gte: timeStart, $lt: now },
//     status: 'completed',
//   });

//   // Handle the taskDays logic for specific-weekdays, weekly-count, or monthly-count
//   if (userHabit.taskType === 'weekly' && userHabit.taskDays === 'specific-weekdays') {
//     const currentDay = now.getDay();
//     if (!userHabit.specificWeekdays.includes(currentDay)) {
//       throw new ApiError(httpStatus.BAD_REQUEST, 'This habit is not scheduled for today');
//     }
//   }

//   // Create a new log or update the counterForDay
//   if (!habitLog) {
//     return await UserHabitLog.create(data);
//   }
//   if (habitLog.counterForDay >= userHabit.numberOfTimes) {
//     throw new ApiError(
//       httpStatus.BAD_REQUEST,
//       'Done for the day: You can log this habit again tomorrow'
//     );
//   }

//   habitLog.counterForDay += 1;
//   const savedHabitLog = await habitLog.save();
//   return await savedHabitLog.populate('userHabitId')
// };
const createUserHabitLog = async (data) => {
  const userHabit = await UserHabit.findById(data.userHabitId);
  if (!userHabit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User habit not found');
  }
  const nowUTC = new Date();
  const offsetMs = userHabit.offset * 60 * 1000;
  const nowClient = new Date(nowUTC.getTime() + offsetMs);
  let clientTimeStart;
  if (userHabit.taskType === 'daily') {
    clientTimeStart = new Date(nowClient.getFullYear(), nowClient.getMonth(), nowClient.getDate());
  } else if (userHabit.taskType === 'weekly') {
    const dayOfWeek = nowClient.getDay();
    clientTimeStart = new Date(nowClient.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
    clientTimeStart = new Date(clientTimeStart.getFullYear(), clientTimeStart.getMonth(), clientTimeStart.getDate());
  } else if (userHabit.taskType === 'monthly') {
    clientTimeStart = new Date(nowClient.getFullYear(), nowClient.getMonth(), 1);
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unsupported task type');
  }
  const startDateUTC = new Date(clientTimeStart.getTime() - offsetMs);
  const habitLog = await UserHabitLog.findOne({
    userHabitId: data.userHabitId,
    dateTime: { $gte: startDateUTC, $lt: nowUTC },
    status: 'completed',
  });
  if (userHabit.taskType === 'weekly' && userHabit.taskDays === 'specific-weekdays') {
    const currentDay = nowClient.getDay();
    if (!userHabit.specificWeekdays.includes(currentDay)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'This habit is not scheduled for today');
    }
  }
  if (!habitLog) {
    return await UserHabitLog.create(data);
  }
  if (habitLog.counterForDay >= userHabit.numberOfTimes) {
    await UserHabit.findByIdAndUpdate(userHabit._id, { status: 'completed' });
    throw new ApiError(httpStatus.BAD_REQUEST, 'Done for the day: You can log this habit again tomorrow');
  }
  habitLog.counterForDay += 1;
  const savedHabitLog = await habitLog.save();
  return await savedHabitLog.populate('userHabitId');
};


const getDatedHabitLogs = async (userHabitId, startDate, endDate) => {
    return getMapsByDateForHabitLog(UserHabitLog, {userHabitId}, startDate, endDate);
}

// const getHabitCompletionCount = async (habitId, userId) => {
//   try {
//     // Fetch the UserHabit document
//     const userHabit = await UserHabit.findOne({habitId: habitId, userId:userId});
//     if (!userHabit) {
//       throw new Error('UserHabit not found');
//     }

//     const {  taskType } = userHabit;

//     // Define the start date range based on `taskType`
//     const now = new Date();
//     let startDate;

//     switch (taskType) {
//       case 'daily':
//         startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//         break;

//       case 'weekly':
//         { const weekStart = now.getDate() - now.getDay(); 
//         startDate = new Date(now.setDate(weekStart));
//         break; }

//       case 'monthly':
//         startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
//         break;

//       default:
//         throw new Error('Unsupported taskType');
//     }

//     // Query the UserHabitLog within the calculated date range
//     const habitLog = await UserHabitLog.findOne({
//       userHabitId:userHabit._id,
//       dateTime: { $gte: startDate, $lt: now },
//     });
//     console.log(userHabit._id)
//     // If no log exists for the specified range, return zero
//     const completedCount = habitLog ? habitLog.counterForDay : 0;

//     return completedCount
//   } catch (error) {
//     console.error('Error fetching habit completion count:', error.message);
//     throw new ApiError(500, "Error in calculating the no of times habit performed");
//   }
// };

const getHabitCompletionCount = async (habitId, userId) => {
  try {
    const userHabit = await UserHabit.findOne({ habitId, userId });
    if (!userHabit) {
      throw new Error('UserHabit not found');
    }
    const { taskType, offset } = userHabit;
    const nowUTC = new Date();
    const offsetMs = offset * 60 * 1000;
    const nowClient = new Date(nowUTC.getTime() + offsetMs);
    let clientStartDate;
    switch (taskType) {
      case 'daily':
        clientStartDate = new Date(nowClient.getFullYear(), nowClient.getMonth(), nowClient.getDate());
        break;
      case 'weekly': {
        const dayOfWeek = nowClient.getDay();
        clientStartDate = new Date(nowClient.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        clientStartDate = new Date(clientStartDate.getFullYear(), clientStartDate.getMonth(), clientStartDate.getDate());
        break;
      }
      case 'monthly':
        clientStartDate = new Date(nowClient.getFullYear(), nowClient.getMonth(), 1);
        break;
      default:
        throw new Error('Unsupported taskType');
    }
    // console.log("clientStartDate (local boundary):", clientStartDate.toISOString());
    const startDateUTC = new Date(clientStartDate.getTime() - offsetMs);
    // console.log("startDateUTC (converted boundary):", startDateUTC.toISOString());
    let endDateUTC;
    if (taskType === 'daily') {
      endDateUTC = new Date(startDateUTC.getTime() + 24 * 60 * 60 * 1000);
    } else if (taskType === 'weekly') {
      endDateUTC = new Date(startDateUTC.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (taskType === 'monthly') {
      const clientYear = clientStartDate.getFullYear();
      const clientMonth = clientStartDate.getMonth();
      const nextMonthClient = new Date(clientYear, clientMonth + 1, 1);
      endDateUTC = new Date(nextMonthClient.getTime() - offsetMs);
    }
    // console.log("endDateUTC:", endDateUTC.toISOString());
    const habitLogs = await UserHabitLog.find({
      userHabitId: userHabit._id,
      dateTime: { $gte: startDateUTC, $lt: endDateUTC }
    });
    const completedCount = habitLogs.reduce((total, log) => total + log.counterForDay, 0);
    return completedCount;
  } catch (error) {
    console.error('Error fetching habit completion count:', error.message);
    throw new ApiError(500, "Error in calculating the number of times habit performed");
  }
};

module.exports = {
  createUserHabitLog,
  getDatedHabitLogs,
  getHabitCompletionCount
};
