const {CardioSession} = require('../models');
const {getAllData} = require('../utils/getAllData');
const {getWeeklySessionsMap, getMonthlySessionsMap, getMapsByDate} = require('../utils/getMaps');

const logCardioSession = async cardioSession => {
  return await CardioSession.create(cardioSession);
};

const getAllSessions = async (query, populateConfig) => {
  const data = await getAllData(CardioSession, query, populateConfig);
  return data;
};

const getSessionById = async id => {
  return await CardioSession.findById(id);
};

const getWeeklyCardioSessionsMap = async userId => {
  return await getWeeklySessionsMap(CardioSession, {userId});
};

const getMonthlyCardioSessionsMap = async (userId, year, month) => {
  return await getMonthlySessionsMap(CardioSession, {userId}, year, month);
};

const getDatedCardioSessionsMap = async (userId, startDate, endDate) => {
  return await getMapsByDate(CardioSession, {userId}, startDate, endDate);
};

module.exports = {
  logCardioSession,
  getAllSessions,
  getSessionById,
  getWeeklyCardioSessionsMap,
  getMonthlyCardioSessionsMap,
  getDatedCardioSessionsMap,
};
