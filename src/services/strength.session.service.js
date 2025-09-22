const mongoose = require('mongoose');
const {StrengthSession, StrengthBestSession, UserPreference} = require('../models');
const {getAllData} = require('../utils/getAllData');
const {getWeeklySessionsMap, getMonthlySessionsMap, getMapsByDate} = require('../utils/getMaps');

const MIN_SETS = 3;
const MAX_SETS = 7;

const logStrengthSession = async strengthSession => {
  const {userId, exerciseId, dateTime} = strengthSession;
  if (!strengthSession.logType || !strengthSession.unitSystem) {
    const prefs = await UserPreference.findOne({userId}).lean();
    if (!strengthSession.logType) {
      strengthSession.logType = prefs?.logType || 'average';
    }
    if (!strengthSession.unitSystem) {
      strengthSession.unitSystem = prefs?.unitSystem || 'metric';
    }
  }
  const logType = strengthSession.logType;
  const existingSession = await StrengthSession.findOne({
    userId,
    exerciseId,
    dateTime: {
      $gte: new Date(new Date(dateTime).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(dateTime).setHours(23, 59, 59, 999)),
    },
  });

  if (existingSession) {
    throw new Error('You have already logged a session for this exercise on selected date');
  }

  if (logType === 'bySet') {
    const setsDetails = Array.isArray(strengthSession.setsDetails) ? strengthSession.setsDetails : [];
    if (setsDetails.length < MIN_SETS) {
      throw new Error(`Please log at least ${MIN_SETS} sets`);
    }
    if (setsDetails.length > MAX_SETS) {
      throw new Error(`Please log no more than ${MAX_SETS} sets`);
    }

    let totalReps = 0;
    let totalWeight = 0;
    let sumWeights = 0;
    for (const s of setsDetails) {
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      const tw = w * r;
      totalReps += r;
      totalWeight += tw;
      sumWeights += w;
      s.totalWeight = tw;
    }
    const avgWeight = setsDetails.length > 0 ? sumWeights / setsDetails.length : 0;
    strengthSession.weight = avgWeight;
    strengthSession.sets = setsDetails.length;
    strengthSession.reps = Math.round(totalReps / (setsDetails.length || 1));
    strengthSession.totalReps = totalReps;
    strengthSession.totalWeight = totalWeight;
  } else {
    const safeWeight = Number(strengthSession.weight) || 0;
    const safeSets = Number(strengthSession.sets) || 0;
    const safeReps = Number(strengthSession.reps) || 0;
    if (safeSets < MIN_SETS) {
      throw new Error(`Minimum ${MIN_SETS} sets required`);
    }
    if (safeSets > MAX_SETS) {
      throw new Error(`Maximum ${MAX_SETS} sets allowed`);
    }
    strengthSession.totalReps = safeSets * safeReps;
    strengthSession.totalWeight = safeWeight * strengthSession.totalReps;
  }

  return await StrengthSession.create(strengthSession);
};

const getAllSessions = async (query, populateConfig) => {
  const data = await getAllData(StrengthSession, query, populateConfig);
  return data;
};

const getSessionById = async id => {
  return await StrengthSession.findById(id);
};

const getSessionByDate = async (userId, exerciseId, date) => {
  const startOfDay = new Date(date);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return await StrengthSession.findOne({
    userId,
    exerciseId,
    dateTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  })
    .populate({
      path: 'exerciseId',
      select: '-createdAt -updatedAt -isDeleted -__v',
      populate: [
        {path: 'primaryCategory', model: 'PrimaryCategory', select: '-createdAt -updatedAt -isDeleted -__v'}, // Replace CategoryModel with the actual model for primaryCategory
        {path: 'targetedMuscle', model: 'TargetedMuscles', select: '-createdAt -updatedAt -isDeleted -__v'}, // Replace MuscleModel with the actual model for targetedMuscle
      ],
    })
    .sort({dateTime: -1});
};

const getLastSession = async (userId, exerciseId) => {
  return await StrengthSession.findOne({userId, exerciseId}).sort({dateTime: -1});
};

// const checkAndLogBestSession = async session => {
//   const {userId, sessionId} = session;
//   const {exerciseId, totalReps, weight} = session._doc;

//   let bestSession = await StrengthBestSession.findOne({userId, exerciseId}).populate('sessionId');
//   let isUpdated = false;

//   if (!bestSession) {
//     bestSession = await StrengthBestSession.create({userId, exerciseId, sessionId});
//     bestSession = await StrengthBestSession.findOne({_id: bestSession._id}).populate('sessionId');
//     isUpdated = true;
//   } else {
//     const currentBest = bestSession.sessionId;
//     if (
//       totalReps > (currentBest.totalReps || 0) ||
//       (totalReps === (currentBest.totalReps || 0) && weight > (currentBest.weight || 0))
//     ) {
//       bestSession = await StrengthBestSession.findByIdAndUpdate(
//         bestSession._id,
//         {userId, exerciseId, sessionId},
//         {new: true}
//       ).populate('sessionId');
//       isUpdated = true;
//     }
//   }

//   return {bestSession: bestSession.sessionId, updated: isUpdated};
// };

const checkAndLogBestSession = async session => {
  const { userId, sessionId } = session;
  const { exerciseId, totalReps, weight } = session._doc;
  const totalWork = weight * totalReps;

  let bestSession = await StrengthBestSession
    .findOne({ userId, exerciseId })
    .populate('sessionId');
  let isUpdated = false;

  if (!bestSession) {
    bestSession = await StrengthBestSession.create({ userId, exerciseId, sessionId });
    bestSession = await StrengthBestSession
      .findById(bestSession._id)
      .populate('sessionId');
    isUpdated = true;
  } else {
    const cb = bestSession.sessionId;
    const currentWork = (cb.weight || 0) * (cb.totalReps || 0);
    if (
      totalWork > currentWork ||
      (
        totalWork === currentWork &&
        weight > (cb.weight || 0)
      ) ||
      (
        totalWork === currentWork &&
        weight === (cb.weight || 0) &&
        totalReps > (cb.totalReps || 0)
      )
    ) {
      bestSession = await StrengthBestSession.findByIdAndUpdate(
        bestSession._id,
        { userId, exerciseId, sessionId },
        { new: true }
      ).populate('sessionId');
      isUpdated = true;
    }
  }

  return { bestSession: bestSession.sessionId, updated: isUpdated };
};

const getUserBestSessions = async (userId, query, populateConfig) => {
  const data = await getAllData(StrengthBestSession, {...query, userId}, populateConfig);
  return data;
};

const getUserExerciseBestSession = async (userId, exerciseId) => {
  return await StrengthBestSession.findOne({userId, exerciseId})
    .populate('sessionId')
    .sort({'sessionId.totalReps': -1, 'sessionId.weight': -1});
};

const getWeeklyStrengthMap = async (userId, exerciseId) => {
  return await getWeeklySessionsMap(StrengthSession, {userId, exerciseId});
};

const getMonthlyStrengthMap = async (userId, exerciseId, year, month) => {
  return await getMonthlySessionsMap(StrengthSession, {userId, exerciseId}, year, month);
};
const getDatedStrengthSessionsMapp = async (userId, startDate, endDate, exerciseIds = []) => {
  const query = {
    userId,
    dateTime: {$gte: startDate, $lte: endDate},
  };

  if (exerciseIds.length > 0) {
    query.exerciseId = {$in: exerciseIds};
  }

  return await getMapsByDate(StrengthSession, query, startDate, endDate);
};

const getDatedStrengthMap = async (userId, exerciseId, startDate, endDate) => {
  return await getMapsByDate(StrengthSession, {userId, exerciseId}, startDate, endDate);
};

async function calculateMonthlyAvgWeight(userId, exerciseId) {
  const currentYear = new Date().getFullYear();

  const results = await StrengthSession.aggregate([
    // Match records for the given user, exercise, and current year
    {
      $match: {
        userId: userId,
        exerciseId: new mongoose.Types.ObjectId(exerciseId),
        dateTime: {
          $gte: new Date(`${currentYear}-01-01T00:00:00Z`),
          $lte: new Date(`${currentYear}-12-31T23:59:59Z`),
        },
      },
    },
    // Group by month and calculate average weight
    {
      $group: {
        _id: {$month: '$dateTime'}, // Group by month
        avgWeight: {$avg: '$weight'},
      },
    },
    // Sort by month
    {
      $sort: {_id: 1},
    },
  ]);

  // Initialize an array with all months set to 0
  const avgWeightPerMonth = [];
  for (let month = 1; month <= 12; month++) {
    avgWeightPerMonth.push({
      month: month.toString(),
      avgWeight: 0,
    });
  }

  // Populate the array with actual averages from the query
  results.forEach(result => {
    const index = result._id - 1; // Adjust month (1-indexed) to array index (0-indexed)
    avgWeightPerMonth[index].avgWeight = result.avgWeight;
  });

  return avgWeightPerMonth;
}

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
  getDatedStrengthMap,
  calculateMonthlyAvgWeight,
  getSessionByDate,
  getDatedStrengthSessionsMapp,
};
