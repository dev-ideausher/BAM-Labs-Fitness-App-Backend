const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { userHabitLogService } = require('../services');
const { getHabitCompletionCount } = require('../services/user.habit.session');


const createLog = catchAsync(async (req, res) => {
  const { userHabitId } = req.body;

  const logData = {
    userHabitId,
    userId: req.user._id, // Assuming the user is authenticated and `req.user` exists
    dateTime: new Date(),
  };

  const habitLog = await userHabitLogService.createUserHabitLog(logData);
  // habitLog.userHabitId.habitPerformed = await getHabitCompletionCount(habitLog.userHabitId.habitId, req.user._id);
  res.status(httpStatus.CREATED).json({
    status: true,
    message: 'User habit logged successfully',
    habitLog,
  });
});

const getDatedHabitLogs = catchAsync(async (req, res) => {
  const { userHabitId } = req.params;
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);

  const habitLogs = await userHabitLogService.getDatedHabitLogs(userHabitId, startDate, endDate);

  res.status(httpStatus.OK).json({
    status: true,
    message: 'Habit logs fetched successfully',
    data:habitLogs,
  });
});

module.exports = {
  createLog,
  getDatedHabitLogs,
};
