const {cardioSessionService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const logSession = catchAsync(async (req, res) => {
  const session = await cardioSessionService.logCardioSession({...req.body, userId: req.user._id});
  res.status(200).json({
    status: true,
    message: 'Session logged successfully',
    session,
  });
});

const getMySessions = catchAsync(async (req, res) => {
  const sessions = await cardioSessionService.getAllSessions({userId: req.user._id, ...req.query});
  res.status(200).json({
    status: true,
    message: 'Sessions fetched successfully',
    sessions,
  });
});

const getCardioMaps = catchAsync(async (req, res) => {
  const weeklyMap = await cardioSessionService.getWeeklyCardioSessionsMap(req.user._id);
  const monthlyMap = await cardioSessionService.getMonthlyCardioSessionsMap(
    req.user._id,
    req.query.year,
    req.query.month
  );
  res.status(200).json({
    status: true,
    message: 'Cardio maps fetched successfully',
    weeklyMap,
    monthlyMap,
  });
});

const getDatedCardioMaps = catchAsync(async (req, res) => {
  const startDate = new Date(req.query.startDate);
  const endDate = new Date(req.query.endDate);
  const datedMap = await cardioSessionService.getDatedCardioSessionsMap(req.user._id, startDate, endDate);
  res.status(200).json({
    status: true,
    message: 'Dated cardio map fetched successfully',
    datedMap,
  });
});

module.exports = {
  logSession,
  getMySessions,
  getCardioMaps,
  getDatedCardioMaps,
};
