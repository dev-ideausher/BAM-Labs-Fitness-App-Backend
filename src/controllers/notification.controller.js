const {notificationService} = require('../services');
const catchAsync = require('../utils/catchAsync');
const {getPaginateConfig} = require('../utils/queryPHandler');

const createNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createNotification(req.body);
  res.status(200).json({
    status: true,
    message: 'Notification created successfully',
    notification,
  });
});
const getAllNotifications = catchAsync(async (req, res) => {
  const {filters, options} = getPaginateConfig(req.query);

  if (req.query.userType) {
    filters.userType = req.query.userType;
  }
  const data = await notificationService.getAllNotifications(filters, options);
  res.status(200).json({
    status: true,
    message: 'Notifications fetched successfully',
    data,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.deleteNotification(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Notification deleted successfully',
    notification,
  });
});

module.exports = {
  createNotification,
  getAllNotifications,
  deleteNotification,
};
