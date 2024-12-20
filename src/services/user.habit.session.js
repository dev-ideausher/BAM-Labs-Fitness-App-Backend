const httpStatus = require('http-status');
const { UserHabit } = require('../models');
const { UserHabitLog } = require('../models/userHabitLog.model');
const ApiError = require('../utils/ApiError');
const { getMapsByDate } = require('../utils/getMaps');

const createUserHabitLog = async (data) => {
    const userHabit = await UserHabit.findById(data.userHabitId);
    if (!userHabit) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User habit not found');
    }

    const timeeStampBefore24Hours = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

    const habitLogs = await UserHabitLog.findOne({
      userHabitId:data.userHabitId,
      dateTime: {$gte: timeeStampBefore24Hours, $lt:new Date()},
      status: 'completed'
    })
    if(!habitLogs){
        return await UserHabitLog.create(data);
    };
    if(userHabit.numberOfTimes <= habitLogs.counterForDay){
        throw new ApiError(httpStatus.BAD_REQUEST, 'Done for the day : Now you can do it tommorrow');
    }
    habitLogs.counterForDay += 1;
    const saved =await habitLogs.save();
    return saved;
}
const getDatedHabitLogs = async (userHabitId, startDate, endDate) => {
    return getMapsByDate(UserHabitLog, {userHabitId}, startDate, endDate);
}
module.exports = {
  createUserHabitLog,
  getDatedHabitLogs
};
