const {UserHabit} = require('../models');
const { UserHabitLog } = require('../models/userHabitLog.model');
const {getAllData} = require('../utils/getAllData');

const createUserHabit = async habit => {
  return await UserHabit.create(habit);
};

const getUserHabit = async userHabitId => {
  const userHabit = await UserHabit.findById(userHabitId).populate('habitId');
  
  if (!userHabit) {
    return null;
  }

  const stats = await calculateStats(userHabit);
  
  return {
    ...userHabit.toObject(),
    ...stats
  };
};

const getUserHabits = async (userId, query, populate) => {
  return await getAllData(UserHabit, {userId, ...query}, populate);
};

const updateUserHabit = async (userHabitId, habit) => {
  return await UserHabit.findByIdAndUpdate(userHabitId, habit, {new: true});
};

const deleteUserHabit = async userHabitId => {
  return await UserHabit.findByIdAndDelete(userHabitId);
};
const calculateStats = async (userHabit) => {
  const logs = await UserHabitLog.find({ 
    userHabitId: userHabit._id,
  }).sort({ dateTime: 1 });

  let currentStreak = 0;
  let bestStreak = 0;
  let lastDate = null;

  for (const log of logs) {
    if (log.status !== 'completed') continue;

    const currentDate = new Date(log.dateTime);
    currentDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      currentStreak = 1;
    } else {
      const daysDiff = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
      
      const streakContinues = (
        (userHabit.taskType === 'daily' && daysDiff === 1) ||
        (userHabit.taskType === 'weekly' && daysDiff <= 7) ||
        (userHabit.taskType === 'monthly' && daysDiff <= 31)
      );

      if (streakContinues) {
        currentStreak++;
      } else {
        if (currentStreak > bestStreak) {
          bestStreak = currentStreak;
        }
        currentStreak = 1;
      }
    }

    lastDate = currentDate;
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  const totalLogs = logs.length;
  const completedLogs = logs.filter(log => log.status === 'completed').length;
  const skippedLogs = logs.filter(log => log.status === 'skipped').length;
  const missedLogs = logs.filter(log => log.status === 'missed').length;
  
  const completionRate = totalLogs > 0 
    ? (completedLogs / (completedLogs + missedLogs)) * 100 
    : 0;

  const now = new Date();
  let periodStart = new Date(now);
  
  switch (userHabit.taskType) {
    case 'daily':
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      break;
  }

  const currentPeriodLogs = logs.filter(log => 
    new Date(log.dateTime) >= periodStart && 
    log.status === 'completed'
  );

  let currentPeriodCount = 0;
  if (userHabit.taskDays === 'everyday' || userHabit.taskDays === 'specific-weekdays') {
    currentPeriodCount = currentPeriodLogs.length;
  } else {
    currentPeriodCount = currentPeriodLogs.reduce((sum, log) => sum + (log.counterForDay || 1), 0);
  }

  const progressPercentage = (currentPeriodCount / userHabit.numberOfTimes) * 100;

  return {
    bestStreak,
    completionRate: Math.round(completionRate * 10) / 10,
    completions: completedLogs,
    // skipped: skippedLogs,
    // missed: missedLogs,
    progressPercentage: Math.min(100, Math.round(progressPercentage)),
    // currentPeriodCount
  };
};

module.exports = {
  createUserHabit,
  getUserHabit,
  getUserHabits,
  updateUserHabit,
  deleteUserHabit,
};
