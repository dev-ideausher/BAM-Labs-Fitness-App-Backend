const Notification = require("../models/notification.model");



const createNotification = async notification => {
  return await Notification.create({...notification, isByAdmin: true});
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