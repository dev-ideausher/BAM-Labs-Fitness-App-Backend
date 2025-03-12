const {UserHabit, Habit} = require('../models');
const {UserHabitLog} = require('../models/userHabitLog.model');
const {getAllData} = require('../utils/getAllData');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

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
    ...stats,
  };
};

const getUserHabits = async (userId, query, populate) => {
  return await getAllData(UserHabit, {userId, ...query}, populate);
};

const updateUserHabit = async (userHabitId, habit) => {
  return await UserHabit.findByIdAndUpdate(userHabitId, habit, {new: true});
};

const deleteUserHabit = async userHabitId => {
  await UserHabitLog.deleteMany({userHabitId});
  const userHabit = await UserHabit.findById(userHabitId);
  if (!userHabit) {
    throw new Error('UserHabit not found');
  }
  await userHabit.deleteOne();
  const habit = await Habit.findById(userHabit.habitId);
  if (habit && habit.__t === 'CustomHabit') {
    await Habit.findByIdAndDelete(userHabit.habitId);
  }
  return;
};

const calculateStats = async userHabit => {
  const logs = await UserHabitLog.find({
    userHabitId: userHabit._id,
  }).sort({dateTime: 1});

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

      const streakContinues = (() => {
        if (userHabit.taskType === 'daily') {
          if (userHabit.taskDays === 'everyday') {
            return daysDiff <= 2;
          } else if (userHabit.taskDays === 'specific-weekdays') {
            const missedDates = [];
            for (let i = 1; i <= daysDiff; i++) {
              const checkDate = new Date(lastDate);
              checkDate.setDate(lastDate.getDate() + i);
              if (userHabit.specificWeekdays.includes(checkDate.getDay())) {
                missedDates.push(checkDate);
              }
            }
            return missedDates.length <= 2;
          }
        } else if (userHabit.taskType === 'weekly') {
          return daysDiff <= 7;
        } else if (userHabit.taskType === 'monthly') {
          return daysDiff <= 31;
        }
        return false;
      })();

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
  const completionRate = totalLogs > 0 ? (completedLogs / (completedLogs + missedLogs)) * 100 : 0;

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

  const currentPeriodLogs = logs.filter(log => new Date(log.dateTime) >= periodStart && log.status === 'completed');

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

const restoreHabitStreak = async (userHabitId, userId) => {
  const userHabit = await UserHabit.findOne({_id: userHabitId, userId});
  if (!userHabit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User habit not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const restorationLog = await UserHabitLog.findOne({
    userHabitId,
    userId,
    dateTime: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
    isRestored: true,
  });

  if (restorationLog) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You have already restored your streak today. Please try again tomorrow.'
    );
  }

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);

  const recentLogs = await UserHabitLog.find({
    userHabitId,
    dateTime: {$gte: threeDaysAgo},
    isRestored: {$ne: true},
  }).sort({dateTime: -1});

  const missedDays = calculateMissedDays(
    recentLogs,
    userHabit.taskType,
    userHabit.taskDays,
    userHabit.specificWeekdays
  );

  if (missedDays > 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot restore streak. More than 2 days have been missed.');
  }

  if (missedDays === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No missed days found in the last 3 days.');
  }

  const restoredLogs = [];

  for (let i = 1; i <= missedDays; i++) {
    const missedDate = new Date(today);
    missedDate.setDate(today.getDate() - i);

    const existingRestoredLog = await UserHabitLog.findOne({
      userHabitId,
      dateTime: {
        $gte: new Date(missedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(missedDate.setHours(23, 59, 59, 999)),
      },
      isRestored: true,
    });

    if (existingRestoredLog) {
      continue;
    }

    if (userHabit.taskDays === 'specific-weekdays') {
      if (!userHabit.specificWeekdays.includes(missedDate.getDay())) {
        continue;
      }
    }

    const preferredTime = getUserPreferredTime(userHabit);
    missedDate.setHours(preferredTime.getHours(), preferredTime.getMinutes());

    const restoredLog = await UserHabitLog.create({
      userHabitId,
      userId,
      dateTime: missedDate,
      status: 'completed',
      counterForDay: userHabit.numberOfTimes,
      isRestored: true,
    });

    restoredLogs.push(restoredLog);
  }

  if (restoredLogs.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'These days have already been restored.');
  }

  return {
    restoredDays: restoredLogs.length,
    logs: restoredLogs,
  };
};
const calculateMissedDays = (logs, taskType, taskDays, specificWeekdays = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  if (taskType === 'daily') {
    if (taskDays === 'everyday') {
      return countMissedDays([today, yesterday, twoDaysAgo], logs);
    } else if (taskDays === 'specific-weekdays') {
      const relevantDays = [today, yesterday, twoDaysAgo].filter(date => specificWeekdays.includes(date.getDay()));
      return countMissedDays(relevantDays, logs);
    }
  }

  if (taskType === 'weekly' || taskType === 'monthly') {
    const latestLog = logs[0];
    if (!latestLog) return 1;

    const daysSinceLastCompletion = Math.floor((today - latestLog.dateTime) / (1000 * 60 * 60 * 24));

    return daysSinceLastCompletion > 2 ? 3 : daysSinceLastCompletion;
  }

  return 0;
};

const countMissedDays = (datesToCheck, logs) => {
  let missedCount = 0;

  for (const date of datesToCheck) {
    const hasCompletionForDay = logs.some(log => {
      const logDate = new Date(log.dateTime);
      return logDate.toDateString() === date.toDateString() && log.status === 'completed';
    });

    if (!hasCompletionForDay) {
      missedCount++;
    }
  }

  return missedCount;
};

const getUserPreferredTime = userHabit => {
  if (userHabit.customTimes && userHabit.customTimes.length > 0) {
    const [hours, minutes] = userHabit.customTimes[0].split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time;
  }
  const defaultTime = new Date();
  defaultTime.setHours(12, 0);
  return defaultTime;
};

const getHabitStatistics = async userId => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const userHabits = await UserHabit.find({userId});

  const habitLogs = await UserHabitLog.find({
    userId,
    dateTime: {$gte: thirtyDaysAgo},
  });

  const activeHabitIds = [...new Set(habitLogs.map(log => log.userHabitId.toString()))];
  const activeHabits = activeHabitIds.length;

  const habitStats = await Promise.all(userHabits.map(habit => calculateStats(habit)));
  const averageCompletionRate =
    habitStats.reduce((sum, stat) => sum + stat.completionRate, 0) / (habitStats.length || 1);

  const bestStreak = Math.max(...habitStats.map(stat => stat.bestStreak));
  const uniqueDays = [...new Set(habitLogs.map(log => new Date(log.dateTime).toDateString()))].length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const habitsCompletedToday = await UserHabitLog.countDocuments({
    userId,
    dateTime: {$gte: today},
    status: 'completed',
  });

  return {
    activeHabits,
    averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
    bestStreak,
    ActiveDays: uniqueDays,
    habitsCompletedToday,
  };
};

module.exports = {
  createUserHabit,
  getUserHabit,
  getUserHabits,
  updateUserHabit,
  deleteUserHabit,
  restoreHabitStreak,
  getHabitStatistics,
};
