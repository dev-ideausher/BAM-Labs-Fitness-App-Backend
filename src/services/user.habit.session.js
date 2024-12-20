
const { UserHabitLog } = require('../models/userHabitLog.model');
const { getMapsByDate } = require('../utils/getMaps');

const createUserHabitLog = async (data) => {
  return await UserHabitLog.create(data);
};

const getDatedHabitLogs = async (userHabitId, startDate, endDate) => {
    return getMapsByDate(UserHabitLog, {userHabitId}, startDate, endDate);
}

module.exports = {
  createUserHabitLog,
  getDatedHabitLogs
};
