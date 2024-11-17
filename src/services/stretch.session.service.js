const {StretchSession} = require('../models');
const {getAllData} = require('../utils/getAllData');

const logStrechSession = async stretchSession => {
  return await StretchSession.create(stretchSession);
};

const getAllSessions = async (query, populateConfig) => {
  const data = await getAllData(StretchSession, query, populateConfig);
  return data;
};

const getSessionById = async id => {
  return await StretchSession.findById(id);
};

const getWeeklySessionsMap = async (userId, exerciseId) => {
  return await getWeeklySessionsMap(StretchSession, {userId, exerciseId});
};

const getMonthlySessionsMap = async (userId, exerciseId, year, month) => {
  return await getMonthlySessionsMap(StretchSession, {userId, exerciseId}, year, month);
};

module.exports = {
  logStrechSession,
  getAllSessions,
  getSessionById,
  getWeeklySessionsMap,
  getMonthlySessionsMap,
};
