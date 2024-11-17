const {cardioSessionService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const logSession = catchAsync(async (req, res) => {
  const session = await cardioSessionService.logCardioSession(req.body);
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
  const weeklyMap = await cardioSessionService.getWeeklyCardioMap(req.user._id, req.params.exerciseId);
  const monthlyMap = await cardioSessionService.getMonthlyCardioMap(
    req.user._id,
    req.params.exerciseId,
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

module.exports = {
  logSession,
  getMySessions,
  getCardioMaps,
};
