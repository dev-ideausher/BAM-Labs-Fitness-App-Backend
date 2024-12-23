const {strengthSessionService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const logSession = catchAsync(async (req, res) => {
  const session = await strengthSessionService.logStrengthSession({...req.body, userId: req.user._id});
  console.log(session);
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
});

const getMySessions = catchAsync(async (req, res) => {
  const sessions = await strengthSessionService.getAllSessions({userId: req.user._id, ...req.query});
  res.status(200).json({
    status: true,
    message: 'Sessions fetched successfully',
    sessions,
  });
});

const getLastAndBestSession = catchAsync(async (req, res) => {
  const lastSession = await strengthSessionService.getLastSession(req.user._id, req.params.exerciseId);
  const bestSession = await strengthSessionService.getUserExerciseBestSession(req.user._id, req.params.exerciseId);
  res.status(200).json({
    status: true,
    message: 'Last and best session fetched successfully',
    lastSession,
    bestSession,
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
  const datedMap = await strengthSessionService.getDatedStrengthMap(req.user._id, req.params.exerciseId, startDate, endDate);
  res.status(200).json({
    status: true,
    message: 'Dated strength map fetched successfully',
    datedMap,
  });
});

module.exports = {
  logSession,
  getMySessions,
  getLastAndBestSession,
  getStrengthMaps,
  getDatedStrengthMaps
};
