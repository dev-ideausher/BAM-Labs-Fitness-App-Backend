const {StretchSession} = require('../models');
const {getAllData} = require('../utils/getAllData');
const {getWeeklySessionsMap, getMonthlySessionsMap} = require('../utils/getMaps');

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

const getWeeklyStretchMap = async (userId, exerciseId) => {
  return await getWeeklySessionsMap(StretchSession, {userId, exerciseId});
};

const getMonthlyStretchMap = async (userId, exerciseId, year, month) => {
  return await getMonthlySessionsMap(StretchSession, {userId, exerciseId}, year, month);
};

module.exports = {
  logStrechSession,
  getAllSessions,
  getSessionById,
  getWeeklyStretchMap,
  getMonthlyStretchMap,
};
