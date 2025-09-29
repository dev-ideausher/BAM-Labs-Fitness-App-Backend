const {strengthSessionService} = require('../services');
const catchAsync = require('../utils/catchAsync');
const {StrengthExercise, PrimaryCategory} = require('../models');
const {StrengthSession, StrengthBestSession} = require('../models');

const logSession = catchAsync(async (req, res) => {
  try {
    const session = await strengthSessionService.logStrengthSession({...req.body, userId: req.user._id});
    const data = await strengthSessionService.checkAndLogBestSession({
      ...session,
      sessionId: session._id,
      userId: req.user._id,
    });
    res.status(200).json({
      status: true,
      message: 'Session logged successfully',
      session,
      bestSession: data,
    });
  } catch (error) {
    if (
      error.message === 'You have already logged a session for this exercise on selected date' ||
      /Minimum \d+ sets required/.test(error.message) ||
      /Maximum \d+ sets allowed/.test(error.message) ||
      /Please log (at least|no more than)/.test(error.message)
    ) {
      return res.status(400).json({status: false, message: error.message});
    }
    res.status(500).json({status: false, message: 'Internal server error', error: error.message});
  }
});

const getMySessions = catchAsync(async (req, res) => {
  const sessions = await strengthSessionService.getAllSessions({userId: req.user._id, ...req.query});
  res.status(200).json({
    status: true,
    message: 'Sessions fetched successfully',
    sessions,
  });
});

const getSessionByDate = catchAsync(async (req, res) => {
  const session = await strengthSessionService.getSessionByDate(req.user._id, req.params.exerciseId, req.query.date);
  res.status(200).json({
    status: true,
    message: 'Session fetched successfully',
    session,
  });
});

const getLastAndBestSession = catchAsync(async (req, res) => {
  const lastSession = await strengthSessionService.getLastSession(req.user._id, req.params.exerciseId);
  const bestSession = await strengthSessionService.getUserExerciseBestSession(req.user._id, req.params.exerciseId);
  console.log(bestSession);
  res.status(200).json({
    status: true,
    message: 'Last and best session fetched successfully',
    lastSession,
    bestSession: bestSession?.sessionId || null,
  });
});

const getStrengthMaps = catchAsync(async (req, res) => {
  const weeklyMap = await strengthSessionService.getWeeklyStrengthMap(req.user._id, req.params.exerciseId);
  const monthlyMap = await strengthSessionService.getMonthlyStrengthMap(
    req.user._id,
    req.params.exerciseId,
    req.query.year,
    req.query.month
  );
  res.status(200).json({
    status: true,
    message: 'Strength maps fetched successfully',
    weeklyMap,
    monthlyMap,
  });
});

const getDatedStrengthMaps = catchAsync(async (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);
  const datedMap = await strengthSessionService.getDatedStrengthMap(
    req.user._id,
    req.params.exerciseId,
    startDate,
    endDate
  );
  res.status(200).json({
    status: true,
    message: 'Dated strength map fetched successfully',
    datedMap,
  });
});

const getAvgWeightPerMonthByExcercize = catchAsync(async (req, res) => {
  const {exerciseId} = req.params;
  const avgWeightPerMonth = await strengthSessionService.calculateMonthlyAvgWeight(req.user._id, exerciseId);
  res.status(200).json({
    status: true,
    message: 'Avg weight per month fetched successfully',
    avgWeightPerMonth,
  });
});

const getDatedStrengthMap = catchAsync(async (req, res) => {
  const {startDate, endDate, primaryExercise} = req.query;
  const userId = req.user._id;

  if (!startDate || !endDate) {
    return res.status(400).json({message: 'Start date and end date are required'});
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  let datedMap;
  if (primaryExercise) {
    const primaryCategory = await PrimaryCategory.findOne({categoryName: primaryExercise});

    if (!primaryCategory) {
      return res.status(404).json({message: 'Primary exercise category not found'});
    }
    const exercises = await StrengthExercise.find({
      primaryCategory: primaryCategory._id,
      isDeleted: false,
    });

    const exerciseIds = exercises.map(ex => ex._id);
    datedMap = await strengthSessionService.getDatedStrengthSessionsMapp(userId, start, end, exerciseIds);
  } else {
    datedMap = await strengthSessionService.getDatedStrengthSessionsMapp(userId, start, end);
  }

  res.status(200).json({
    status: true,
    message: 'Dated Strength map fetched successfully',
    // datedMap,
    monthlyMap: datedMap,
  });
});

const updateSession = catchAsync(async (req, res) => {
  const {id} = req.params;

  const allowedFields = ['weight', 'sets', 'reps', 'setsDetails', 'logType'];
  const updates = Object.keys(req.body);
  const invalidFields = updates.filter(field => !allowedFields.includes(field));
  if (invalidFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `These fields are not editable: ${invalidFields.join(
        ', '
      )}. Only weight, sets, and reps can be updated.`,
    });
  }
  // const { weight, sets, reps } = req.body;
  // const totalReps = sets * reps;

  // const updatedSession = await StrengthSession.findOneAndUpdate(
  //   { _id: id, userId: req.user._id },
  //   { $set: { weight, sets, reps,totalReps } },
  //   { new: true }
  // );

  // if (!updatedSession) {
  //   return res.status(404).json({
  //     status: false,
  //     message: 'Session not found or not authorized',
  //   });
  // }

  const existingSession = await StrengthSession.findOne({_id: id, userId: req.user._id});
  if (!existingSession) {
    return res.status(404).json({
      status: false,
      message: 'Session not found or not authorized',
    });
  }

  let updatePayload = {};
  if (req.body.logType === 'bySet' || existingSession.logType === 'bySet') {
    const details = req.body.setsDetails || existingSession.setsDetails || [];
    if (details.length < 3) {
      return res.status(400).json({status: false, message: 'Please log at least 3 sets'});
    }
    let totalReps = 0;
    let totalWeight = 0;
    let sumWeights = 0;
    for (const s of details) {
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      const tw = w * r;
      totalReps += r;
      totalWeight += tw;
      sumWeights += w;
      s.totalWeight = tw;
    }
    const avgWeight = sumWeights / details.length;
    updatePayload = {
      logType: 'bySet',
      setsDetails: details,
      sets: details.length,
      weight: avgWeight,
      reps: Math.round(totalReps / details.length),
      totalReps,
      totalWeight,
    };
  } else {
    const safeWeight = req.body.weight !== undefined ? Number(req.body.weight) : existingSession.weight;
    const safeSets = req.body.sets !== undefined ? Number(req.body.sets) : existingSession.sets;
    const safeReps = req.body.reps !== undefined ? Number(req.body.reps) : existingSession.reps;
    const totalReps = safeSets * safeReps;
    const totalWeight = safeWeight * totalReps;
    updatePayload = {weight: safeWeight, sets: safeSets, reps: safeReps, totalReps, totalWeight};
  }

  const updatedSession = await StrengthSession.findOneAndUpdate(
    {_id: id, userId: req.user._id},
    {$set: updatePayload},
    {new: true}
  );

  res.status(200).json({
    status: true,
    message: 'Session updated successfully',
    session: updatedSession,
  });
});

const getLastNSessions = catchAsync(async (req, res) => {
  const n = Number(req.query.n) || 7;
  const userId = req.user._id;
  const {exerciseId} = req.params;

  const sessions = await strengthSessionService.getLastNSessions(userId, exerciseId, n);

  res.status(200).json({
    status: true,
    data: {sessions},
    message: `Last ${sessions.length} session(s) fetched successfully`,
  });
});

const getDailySummary = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const dateStr = req.query.date;
  const date = dateStr ? new Date(dateStr) : new Date();

  const view = req.query.view === 'bySet' ? 'bySet' : 'weight';
  const only = req.query.only === 'true';

  const dailySummary = await strengthSessionService.getDailySummary(userId, date, view, only);

  res.status(200).json({
    status: true,
    data: {dailySummary},
    message: 'Daily summary fetched successfully',
  });
});

const getAllStrengthSessionsMap = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({
      status: false,
      message: 'Valid year and month (1-12) are required',
    });
  }

  const monthlyMap = await strengthSessionService.getAllMonthlyStrengthMap(userId, year, month);

  res.status(200).json({
    status: true,
    message: 'Monthly strength sessions map fetched successfully',
    data: {monthlyMap},
  });
});

module.exports = {
  logSession,
  getMySessions,
  getLastAndBestSession,
  getStrengthMaps,
  getDatedStrengthMaps,
  getAvgWeightPerMonthByExcercize,
  getSessionByDate,
  getDatedStrengthMap,
  updateSession,
  getLastNSessions,
  getDailySummary,
  getAllStrengthSessionsMap,
};
