const {StretchSession} = require('../models');
const {getAllData} = require('../utils/getAllData');
const {getWeeklySessionsMap, getMonthlySessionsMap, getMapsByDate} = require('../utils/getMaps');

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

const getMonthlyStretchMap = async (userId, year, month) => {
  return await getMonthlySessionsMap(StretchSession, {userId}, year, month);
};

const getDatedStretchMap = async (userId, startDate, endDate) => {
  return await getMapsByDate(StretchSession, {userId}, startDate, endDate);
};

module.exports = {
  logStrechSession,
  getAllSessions,
  getSessionById,
  getWeeklyStretchMap,
  getMonthlyStretchMap,
  getDatedStretchMap,
};
