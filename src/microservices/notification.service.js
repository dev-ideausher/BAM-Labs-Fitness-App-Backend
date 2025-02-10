const admin = require('firebase-admin');
const {userNotification} = require('../models/userNotification.model');
async function sendToTopic(userId,topic, notification, data) {
  console.log('Sending notification:', {topic, notification, data});
  const messaging = admin.messaging();
  var payload = {
    notification,
    data,
    topic,
    android: {
      priority: 'high',
      notification: {channel_id: 'high_importance_channel'},
    },
  };
  try {
    const response = await messaging.send(payload);
    const newNotification = new userNotification({
      userId,
      title: notification.title,
      body: notification.body,
      status: 'sent',
      timestamp: new Date(),
    });
    await newNotification.save();
    console.log('Successfully sent message:', response);
    return true;
  } catch (err) {
    console.log(err);
    const failedNotification = new userNotification({
      userId,
      title: notification.title,
      body: notification.body,
      status: 'failed',
      timestamp: new Date(),
    });
    await failedNotification.save();
    return false;
  }
}

module.exports = {
  sendToTopic,
};
