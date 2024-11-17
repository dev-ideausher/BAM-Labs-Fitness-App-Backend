const {CardioSession} = require('../models');
const {getAllData} = require('../utils/getAllData');

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

const getWeeklySessionsMap = async (userId, exerciseId) => {
  return await getWeeklySessionsMap(CardioSession, {userId, exerciseId});
};

const getMonthlySessionsMap = async (userId, exerciseId, year, month) => {
  return await getMonthlySessionsMap(CardioSession, {userId, exerciseId}, year, month);
};

module.exports = {
  logCardioSession,
  getAllSessions,
  getSessionById,
  getWeeklySessionsMap,
  getMonthlySessionsMap,
};
