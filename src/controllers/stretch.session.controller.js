const {stretchSessionService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const logSession = catchAsync(async (req, res) => {
  const session = await stretchSessionService.logStrechSession({...req.body, userId: req.user._id});
  res.status(200).json({
    status: true,
    message: 'Session logged successfully',
    session,
  });
});

const getMySessions = catchAsync(async (req, res) => {
  const sessions = await stretchSessionService.getAllSessions({userId: req.user._id, ...req.query});
  res.status(200).json({
    status: true,
    message: 'Sessions fetched successfully',
    sessions,
  });
});

const getStretchMaps = catchAsync(async (req, res) => {
  const weeklyMap = await stretchSessionService.getWeeklySessionsMap(req.user._id);
  const monthlyMap = await stretchSessionService.getMonthlySessionsMap(req.user._id, req.query.year, req.query.month);
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
