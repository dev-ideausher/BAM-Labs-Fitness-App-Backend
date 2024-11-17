const {StretchSession} = require('../models');
const catchAsync = require('../utils/catchAsync');

const logSession = catchAsync(async (req, res) => {
  const session = await StretchSession.logCardioSession(req.body);
  res.status(200).json({
    status: true,
    message: 'Session logged successfully',
    session,
  });
});

const getMySessions = catchAsync(async (req, res) => {
  const sessions = await StretchSession.getAllSessions({userId: req.user._id, ...req.query});
  res.status(200).json({
    status: true,
    message: 'Sessions fetched successfully',
    sessions,
  });
});

const getStretchMaps = catchAsync(async (req, res) => {
  const weeklyMap = await StretchSession.getWeeklyStretchMap(req.user._id, req.params.exerciseId);
  const monthlyMap = await StretchSession.getMonthlyStretchMap(
    req.user._id,
    req.params.exerciseId,
    req.query.year,
    req.query.month
  );
  res.status(200).json({
    status: true,
    message: 'Stretch maps fetched successfully',
    weeklyMap,
    monthlyMap,
  });
});

module.exports = {
  logSession,
  getMySessions,
  getStretchMaps,
};
