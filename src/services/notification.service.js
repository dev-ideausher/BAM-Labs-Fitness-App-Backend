const Notification = require("../models/notification.model");
const agenda = require("../config/agenda");


// const createNotification = async notification => {
//   return await Notification.create({...notification, isByAdmin: true});
// };
const createNotification = async (notificationData) => {
  const notification = await Notification.create({
    ...notificationData,
    isByAdmin: true,
  });
  // console.log('Created notification:', notification);

if (notification.type === 'PUSH') {
  const job = agenda.create('send push notification', {
    notificationId: notification._id,
  });
  await job.schedule(notification.schedule).save();
} else if (notification.type === 'Email') {
  const job = agenda.create('send email notification', {
    notificationId: notification._id,
  });
  await job.schedule(notification.schedule).save();
}

return notification;
};

const getAllNotifications = async (filters, options) => {
  filters.isByAdmin = true;
  const data = await Notification.paginate(filters, options);
  return data;
};

const deleteNotification = async id => {
  return await Notification.findByIdAndDelete(id);
};

module.exports = {
    createNotification,
    getAllNotifications,
    deleteNotification
}