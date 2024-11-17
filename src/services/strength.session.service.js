const {StrengthSession, StrengthBestSession} = require('../models');
const {getAllData} = require('../utils/getAllData');
const {getWeeklySessionsMap, getMonthlySessionsMap} = require('../utils/getMaps');

const logStrengthSession = async strengthSession => {
  return await StrengthSession.create(strengthSession);
};

const getAllSessions = async (query, populateConfig) => {
  const data = await getAllData(StrengthSession, query, populateConfig);
  return data;
};

const getSessionById = async id => {
  return await StrengthSession.findById(id);
};

const getLastSession = async (userId, exerciseId) => {
  return await StrengthSession.findOne({userId, exerciseId}).sort({dateTime: -1});
};

const checkAndLogBestSession = async session => {
  const {userId, sessionId} = session;
  const {exerciseId, totalReps} = session._doc;

  const bestSession = await StrengthBestSession.findOne({userId, exerciseId}).sort({totalReps: -1});
  const bestSessionData = await StrengthSession.findById(bestSession.sessionId);

  if (!bestSession || totalReps > bestSessionData.totalReps) {
    if (bestSession) {
      const data = await StrengthBestSession.findByIdAndUpdate(bestSession._id, {userId, exerciseId, sessionId});
      return {data, updated: true};
    } else {
      const data = await StrengthBestSession.create({userId, exerciseId, sessionId});
      return {data, updated: true};
    }
  } else {
    return {data: bestSession, updated: false};
  }
};

const getUserBestSessions = async (userId, query, populateConfig) => {
  const data = await getAllData(StrengthBestSession, {...query, userId}, populateConfig);
  return data;
};

const getUserExerciseBestSession = async (userId, exerciseId) => {
  return await StrengthBestSession.findOne({userId, exerciseId}).sort({totalReps: -1});
};

const getWeeklyStrengthMap = async (userId, exerciseId) => {
  return await getWeeklySessionsMap(StrengthSession, {userId, exerciseId});
};

const getMonthlyStrengthMap = async (userId, exerciseId, year, month) => {
  return await getMonthlySessionsMap(StrengthSession, {userId, exerciseId}, year, month);
};

module.exports = {
  logStrengthSession,
  getAllSessions,
  getSessionById,
  getLastSession,
  checkAndLogBestSession,
  getUserBestSessions,
  getUserExerciseBestSession,
  getWeeklyStrengthMap,
  getMonthlyStrengthMap,
};
