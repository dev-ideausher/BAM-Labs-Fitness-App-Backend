const mongoose = require('mongoose');
const {StrengthSession, StrengthBestSession, UserPreference} = require('../models');
const {getAllData} = require('../utils/getAllData');
const {getWeeklySessionsMap, getMonthlySessionsMap, getMapsByDate} = require('../utils/getMaps');

const MIN_SETS = 1;
const MAX_SETS = 14;

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
  const {userId, sessionId} = session;
  const {exerciseId, totalReps, weight} = session._doc;
  const totalWork = weight * totalReps;

  let bestSession = await StrengthBestSession.findOne({userId, exerciseId}).populate('sessionId');
  let isUpdated = false;

  if (!bestSession) {
    bestSession = await StrengthBestSession.create({userId, exerciseId, sessionId});
    bestSession = await StrengthBestSession.findById(bestSession._id).populate('sessionId');
    isUpdated = true;
  } else {
    const cb = bestSession.sessionId;
    const currentWork = (cb.weight || 0) * (cb.totalReps || 0);
    if (
      totalWork > currentWork ||
      (totalWork === currentWork && weight > (cb.weight || 0)) ||
      (totalWork === currentWork && weight === (cb.weight || 0) && totalReps > (cb.totalReps || 0))
    ) {
      bestSession = await StrengthBestSession.findByIdAndUpdate(
        bestSession._id,
        {userId, exerciseId, sessionId},
        {new: true}
      ).populate('sessionId');
      isUpdated = true;
    }
  }

  return {bestSession: bestSession.sessionId, updated: isUpdated};
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
const convertWeight = (weight, fromUnitSystem, toUnitSystem) => {
  if (weight === 0 || weight === null || weight === undefined || isNaN(weight)) {
    return weight;
  }
  
  if (!fromUnitSystem || !toUnitSystem || fromUnitSystem === toUnitSystem) {
    return weight;
  }

  const KG_TO_LBS = 2.20462;
  
  if (fromUnitSystem === 'metric' && toUnitSystem === 'imperial') {
    return weight * KG_TO_LBS;
  } else if (fromUnitSystem === 'imperial' && toUnitSystem === 'metric') {
    return weight / KG_TO_LBS;
  }
  
  return weight;
};

const roundWeightForDisplay = (weight, unitSystem, decimals = null) => {
  if (weight === 0 || weight === null || weight === undefined || isNaN(weight)) {
    return weight;
  }
  
  if (decimals === null) {
    decimals = unitSystem === 'imperial' ? 0 : 1;
  }
  
  const multiplier = Math.pow(10, decimals);
  return Math.round(weight * multiplier) / multiplier;
};

const normalizeAndRecalculateSession = (session, targetUnitSystem = null) => {
  const BASE_UNIT = 'metric';
  const storedUnitSystem = session.unitSystem || 'metric';
  const finalUnitSystem = targetUnitSystem || storedUnitSystem;
  
  let normalizedWeight = 0;
  let normalizedTotalWeight = 0;
  
  if (session.logType === 'bySet' && Array.isArray(session.setsDetails) && session.setsDetails.length > 0) {
    let normalizedSumWeights = 0;
    let normalizedTotal = 0;
    
    for (const set of session.setsDetails) {
      const setWeight = Number(set.weight) || 0;
      const setReps = Number(set.reps) || 0;
      
      const normalizedSetWeightRaw = convertWeight(setWeight, storedUnitSystem, BASE_UNIT);
      const normalizedSetWeight = roundWeightForDisplay(normalizedSetWeightRaw, BASE_UNIT);
      
      const normalizedSetTotalWeight = normalizedSetWeight * setReps;
      
      normalizedSumWeights += normalizedSetWeight;
      normalizedTotal += normalizedSetTotalWeight;
    }
    normalizedWeight = normalizedSumWeights / session.setsDetails.length;
    normalizedTotalWeight = normalizedTotal;
  } else {
    const storedWeight = Number(session.weight) || 0;
    const totalReps = Number(session.totalReps) || 0;
    
    const normalizedWeightRaw = convertWeight(storedWeight, storedUnitSystem, BASE_UNIT);
    normalizedWeight = roundWeightForDisplay(normalizedWeightRaw, BASE_UNIT);
    
    normalizedTotalWeight = normalizedWeight * totalReps;
  }
  const finalWeight = convertWeight(normalizedWeight, BASE_UNIT, finalUnitSystem);
  const finalTotalWeight = convertWeight(normalizedTotalWeight, BASE_UNIT, finalUnitSystem);
  
  return {
    weight: roundWeightForDisplay(finalWeight, finalUnitSystem),
    totalWeight: roundWeightForDisplay(finalTotalWeight, finalUnitSystem),
    unitSystem: finalUnitSystem,
  };
};

const getLastNSessions = async (userId, exerciseId, n = 7, requestedUnitSystem = null) => {
  if (!userId || !exerciseId) {
    return Array.from({length: n}, (_, i) => ({
      session: `Session ${i + 1}`,
      weight: 0,
      totalWeight: 0,
      unitSystem: requestedUnitSystem || null,
      dateTime: null,
    }));
  }

  if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
    return Array.from({length: n}, (_, i) => ({
      session: `Session ${i + 1}`,
      weight: 0,
      totalWeight: 0,
      unitSystem: requestedUnitSystem || null,
      dateTime: null,
    }));
  }

  const exId = new mongoose.Types.ObjectId(exerciseId);

  const docs = await StrengthSession.find({userId, exerciseId: exId})
    .sort({dateTime: -1})
    .limit(Number(n))
    .lean();

  const ordered = docs.reverse();

  const sessions = [];
  for (let i = 0; i < n; i++) {
    if (i < ordered.length) {
      const targetUnitSystem = requestedUnitSystem || ordered[i].unitSystem || 'metric';
      
      const normalized = normalizeAndRecalculateSession(ordered[i], targetUnitSystem);
      
      sessions.push({
        session: `Session ${i + 1}`,
        weight: normalized.weight,
        totalWeight: normalized.totalWeight,
        unitSystem: normalized.unitSystem,
        dateTime: ordered[i].dateTime,
      });
    } else {
      sessions.push({
        session: `Session ${i + 1}`,
        weight: 0,
        totalWeight: 0,
        unitSystem: requestedUnitSystem || null,
        dateTime: null,
      });
    }
  }

  return sessions;
};
const getDualExerciseLastNSessions = async (userId, exercise1, exercise2, n = 7, requestedUnitSystem = null) => {
  if (!userId || !exercise1 || !exercise2) {
    return {
      exercise1: {
        exerciseId: exercise1,
        sessions: Array.from({length: n}, (_, i) => ({
          session: `Session ${i + 1}`,
          weight: 0,
          totalWeight: 0,
          unitSystem: requestedUnitSystem || null,
          dateTime: null,
        })),
      },
      exercise2: {
        exerciseId: exercise2,
        sessions: Array.from({length: n}, (_, i) => ({
          session: `Session ${i + 1}`,
          weight: 0,
          totalWeight: 0,
          unitSystem: requestedUnitSystem || null,
          dateTime: null,
        })),
      },
      minWeight: 0,
      maxWeight: 0,
    };
  }

  const isValidExercise1 = mongoose.Types.ObjectId.isValid(exercise1);
  const isValidExercise2 = mongoose.Types.ObjectId.isValid(exercise2);

  const [exercise1Sessions, exercise2Sessions] = await Promise.all([
    getLastNSessions(userId, exercise1, n, requestedUnitSystem),
    getLastNSessions(userId, exercise2, n, requestedUnitSystem),
  ]);

  const allWeights = [...exercise1Sessions, ...exercise2Sessions]
    .map(s => s.weight)
    .filter(w => w > 0);

  const minWeight = allWeights.length > 0 ? Math.min(...allWeights) : 0;
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 0;

  return {
    exercise1: {
      exerciseId: exercise1,
      sessions: exercise1Sessions,
    },
    exercise2: {
      exerciseId: exercise2,
      sessions: exercise2Sessions,
    },
    minWeight,
    maxWeight,
  };
};

const getDailySummary = async (userId, date, view = 'weight', only = false, timezoneOffset = 0) => {
  if (!userId) {
    return {
      totalWeightLifted: 0,
      totalReps: 0,
      totalWeightInMetric: 0,
      totalWeightInImperial: 0,
      exercises: [],
    };
  }
  const offsetMs = timezoneOffset * 60 * 1000;
  const localDateStart = new Date(date);
  localDateStart.setUTCHours(0, 0, 0, 0);
  const startOfDay = new Date(localDateStart.getTime() - offsetMs);

  const localDateEnd = new Date(date);
  localDateEnd.setUTCHours(23, 59, 59, 999);

  const endOfDay = new Date(localDateEnd.getTime() - offsetMs);

  const sessions = await StrengthSession.find({
    userId: new mongoose.Types.ObjectId(userId),
    dateTime: {$gte: startOfDay, $lte: endOfDay},
  })
    .populate({path: 'exerciseId', select: 'exerciseName primaryCategory'})
    .lean();

  const exerciseMap = new Map();
  let totalWeightLiftedInBaseUnit = 0;
  let totalReps = 0;

  for (const s of sessions) {
    const exId = s.exerciseId?._id?.toString() || `no-ex-${s._id.toString()}`;
    
    const normalized = normalizeAndRecalculateSession(s, 'metric');
    
    const existing = exerciseMap.get(exId) || {
      exerciseId: s.exerciseId?._id || null,
      exerciseName: s.exerciseId?.exerciseName || 'Unknown Exercise',
      logTypes: new Set(), // Track all logTypes
      unitSystem: s.unitSystem || 'metric',
      sessions: [],
      sets: 0,
      reps: 0,
      weight: 0,
      totalReps: 0,
      totalWeightInBaseUnit: 0,
      setsDetails: [],
    };

    existing.sessions.push(s);
    existing.logTypes.add(s.logType || 'average');
    existing.sets += Number(s.sets || 0);
    existing.reps = s.reps || existing.reps;
    existing.weight = normalized.weight;
    existing.totalReps += Number(s.totalReps || 0);
    existing.totalWeightInBaseUnit += normalized.totalWeight;

    if (Array.isArray(s.setsDetails) && s.setsDetails.length) {
      existing.setsDetails = existing.setsDetails.concat(s.setsDetails);
    }

    exerciseMap.set(exId, existing);

    totalWeightLiftedInBaseUnit += normalized.totalWeight;
    totalReps += Number(s.totalReps || 0);
  }

  let exercises = Array.from(exerciseMap.values()).map(ex => {
    let avgWeight = 0;
    if (ex.sessions.length > 0) {
      const normalizedWeights = ex.sessions.map(s => {
        const normalized = normalizeAndRecalculateSession(s, 'metric');
        return normalized.weight;
      }).filter(w => w > 0);
      
      if (normalizedWeights.length > 0) {
        avgWeight = normalizedWeights.reduce((acc, w) => acc + w, 0) / normalizedWeights.length;
      }
    }

    const logType = ex.logTypes.has('bySet') ? 'bySet' : 'average';
    
    const exerciseUnitSystem = ex.unitSystem || 'metric';
    const totalWeightInBaseUnit = ex.totalWeightInBaseUnit || 0;
    
    let totalWeightInOriginalUnit = 0;
    for (const session of ex.sessions) {
      const sessionNormalized = normalizeAndRecalculateSession(session, session.unitSystem || 'metric');
      totalWeightInOriginalUnit += sessionNormalized.totalWeight;
    }
    
    const avgWeightInExerciseUnit = convertWeight(avgWeight, 'metric', exerciseUnitSystem);
    const roundedAvgWeight = roundWeightForDisplay(avgWeightInExerciseUnit, exerciseUnitSystem);
    const roundedTotalWeight = roundWeightForDisplay(totalWeightInOriginalUnit, exerciseUnitSystem);

    if (view === 'bySet' || view === 'all') {
      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        logType: logType,
        unitSystem: ex.unitSystem,
        weight: roundedAvgWeight,
        sets: ex.sets,
        reps: ex.reps,
        totalReps: ex.totalReps,
        totalWeight: roundedTotalWeight,
        setsDetails: ex.setsDetails,
        sessions: ex.sessions.map(s => {
          const sessionNormalized = normalizeAndRecalculateSession(s, s.unitSystem || 'metric');
          return {
            sessionId: s._id,
            dateTime: s.dateTime,
            weight: sessionNormalized.weight,
            sets: s.sets,
            reps: s.reps,
            totalReps: s.totalReps,
            totalWeight: sessionNormalized.totalWeight,
            logType: s.logType,
            setsDetails: s.setsDetails || [],
          };
        }),
      };
    } else {
      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        logType: logType,
        unitSystem: ex.unitSystem,
        weight: roundedAvgWeight,
        sets: ex.sets,
        reps: ex.reps,
        totalReps: ex.totalReps,
        totalWeight: roundedTotalWeight,
        sessions: ex.sessions.map(s => {
          const sessionNormalized = normalizeAndRecalculateSession(s, s.unitSystem || 'metric');
          return {
            sessionId: s._id,
            dateTime: s.dateTime,
            weight: sessionNormalized.weight,
            sets: s.sets,
            reps: s.reps,
            totalReps: s.totalReps,
            totalWeight: sessionNormalized.totalWeight,
            logType: s.logType,
          };
        }),
      };
    }
  });

  if (view === 'bySet') {
    exercises = exercises.filter(e => e.logType === 'bySet');
  } else if (view === 'weight') {
    exercises = exercises.filter(e => e.logType !== 'bySet');
  }

  const filteredTotalWeightInBaseUnit = exercises.reduce((sum, ex) => {
    const weightInMetric = convertWeight(ex.totalWeight || 0, ex.unitSystem || 'metric', 'metric');
    return sum + weightInMetric;
  }, 0);
  const filteredTotalReps = exercises.reduce((sum, ex) => sum + ex.totalReps, 0);

  const filteredTotalWeightInMetric = roundWeightForDisplay(filteredTotalWeightInBaseUnit, 'metric');
  const filteredTotalWeightInImperial = roundWeightForDisplay(
    convertWeight(filteredTotalWeightInBaseUnit, 'metric', 'imperial'),
    'imperial'
  );

  return {
    totalWeightLifted: roundWeightForDisplay(filteredTotalWeightInBaseUnit, 'metric'),
    totalReps: filteredTotalReps,
    totalWeightInMetric: filteredTotalWeightInMetric,
    totalWeightInImperial: filteredTotalWeightInImperial,
    exercises,
  };
};
const getAllMonthlyStrengthMap = async (userId, year, month) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const sessions = await StrengthSession.find({
    userId,
    dateTime: {$gte: startDate, $lte: endDate},
  })
    .sort({dateTime: 1})
    .lean();

  const daysInMonth = new Date(year, month, 0).getDate();
  const dateArray = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dateString = date.toISOString().split('T')[0];
    dateArray.push({
      date: dateString,
      sessionMarked: false,
    });
  }

  sessions.forEach(session => {
    const dateString = session.dateTime.toISOString().split('T')[0];
    const dateObject = dateArray.find(item => item.date === dateString);
    if (dateObject) {
      dateObject.sessionMarked = true;
    }
  });

  return dateArray;
};
const getPast10DaySessions = async (userId, requestedUnitSystem = null, timezoneOffset = 0) => {
  if (!userId) {
    return {
      totalWeightLifted: 0,
      minWeight: 0,
      maxWeight: 0,
      sessions: [],
    };
  }

  const offsetMs = timezoneOffset * 60 * 1000;
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);
  const endDate = new Date(endOfToday.getTime() - offsetMs);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 30);
  startDate.setUTCHours(0, 0, 0, 0);

  const sessions = await StrengthSession.find({
    userId: new mongoose.Types.ObjectId(userId),
    dateTime: {$gte: startDate, $lte: endDate},
  })
    .populate({
      path: 'exerciseId',
      select: 'exerciseName primaryCategory targetedMuscle',
      populate: [
        {path: 'primaryCategory', model: 'PrimaryCategory', select: 'categoryName'},
        {path: 'targetedMuscle', model: 'TargetedMuscles', select: 'targetedMuscle'},
      ],
    })
    .sort({dateTime: -1})
    .lean();

  const dayMap = new Map();

  for (const session of sessions) {
    const sessionDate = new Date(session.dateTime);
    const dateKey = new Date(Date.UTC(sessionDate.getUTCFullYear(), sessionDate.getUTCMonth(), sessionDate.getUTCDate()));
    const dateString = dateKey.toISOString().split('T')[0];

    if (!dayMap.has(dateString)) {
      dayMap.set(dateString, {
        date: dateString,
        dateTime: dateKey,
        exercises: [],
        totalExercises: 0,
        totalWeightLifted: 0,
        totalReps: 0,
        totalSets: 0,
      });
    }

    const daySession = dayMap.get(dateString);
   
    const normalized = normalizeAndRecalculateSession(session, 'imperial');

   
    let convertedSetsDetails = [];
    if (Array.isArray(session.setsDetails) && session.setsDetails.length > 0) {
      const storedUnitSystem = session.unitSystem || 'metric';
      convertedSetsDetails = session.setsDetails.map(set => {
        const setWeight = Number(set.weight) || 0;
        const setReps = Number(set.reps) || 0;
        const convertedWeight = convertWeight(setWeight, storedUnitSystem, 'imperial');
        const convertedTotalWeight = convertWeight(set.totalWeight || (setWeight * setReps), storedUnitSystem, 'imperial');
        
        return {
          weight: roundWeightForDisplay(convertedWeight, 'imperial'),
          reps: setReps,
          totalWeight: roundWeightForDisplay(convertedTotalWeight, 'imperial'),
        };
      });
    }

    const exerciseData = {
      sessionId: session._id,
      exerciseId: session.exerciseId?._id || null,
      exerciseName: session.exerciseId?.exerciseName || 'Unknown Exercise',
      primaryCategory: session.exerciseId?.primaryCategory || null,
      targetedMuscle: session.exerciseId?.targetedMuscle || null,
      dateTime: session.dateTime,
      logType: session.logType || 'average',
      unitSystem: 'imperial',
      weight: normalized.weight,
      sets: session.sets || 0,
      reps: session.reps || 0,
      totalReps: session.totalReps || 0,
      totalWeight: normalized.totalWeight,
      setsDetails: convertedSetsDetails,
    };

    daySession.exercises.push(exerciseData);
    daySession.totalExercises += 1;
    daySession.totalWeightLifted += normalized.totalWeight;
    daySession.totalReps += session.totalReps || 0;
    daySession.totalSets += session.sets || 0;
  }

  const daySessionsRaw = Array.from(dayMap.values())
    .sort((a, b) => b.dateTime - a.dateTime)
    .slice(0, 10);

 
  const unroundedSessionWeights = daySessionsRaw
    .map(daySession => daySession.totalWeightLifted)
    .filter(weight => weight > 0);

  const totalWeightLifted = unroundedSessionWeights.length > 0
    ? roundWeightForDisplay(
        unroundedSessionWeights.reduce((sum, weight) => sum + weight, 0),
        'imperial' 
      )
    : 0;

  const minWeight = unroundedSessionWeights.length > 0
    ? roundWeightForDisplay(Math.min(...unroundedSessionWeights), 'imperial') 
    : 0;

  const maxWeight = unroundedSessionWeights.length > 0
    ? roundWeightForDisplay(Math.max(...unroundedSessionWeights), 'imperial') 
    : 0;

 
  const daySessions = daySessionsRaw.map((daySession, index) => ({
    sessionNumber: index + 1,
    date: daySession.date,
    dateTime: daySession.dateTime,
    totalExercises: daySession.totalExercises,
    totalWeightLifted: roundWeightForDisplay(daySession.totalWeightLifted, 'imperial'),
    totalReps: daySession.totalReps,
    totalSets: daySession.totalSets,
    exercises: daySession.exercises,
  }));

  return {
    totalWeightLifted,
    minWeight,
    maxWeight,
    sessions: daySessions,
  };
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
  getDatedStrengthMap,
  calculateMonthlyAvgWeight,
  getSessionByDate,
  getDatedStrengthSessionsMapp,
  getLastNSessions,
  getDualExerciseLastNSessions,
  getDailySummary,
  getAllMonthlyStrengthMap,
  getPast10DaySessions,
};
