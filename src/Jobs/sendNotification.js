const {sendToTopic} = require('../microservices/notification.service');
const Notification = require('../models/notification.model');

module.exports = agenda => {
  agenda.define('send push notification', async job => {
    const {notificationId} = job.attrs.data;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      console.log(`Notification ${notificationId} not found`);
      return;
    }

    if (notification.type !== 'PUSH') {
      console.log(`Skipping non-PUSH notification ${notificationId}`);
      return;
    }

    let topic;
    switch (notification.userType) {
      case 'all':
        topic = 'all_users';
        break;
      case 'monthly':
        topic = 'monthly_subscribers';
        break;
      case 'annual':
        topic = 'annual_subscribers';
        break;
      case 'individual':
        if (!notification.user) {
          throw new Error('Individual notification missing user ID');
        }
        topic = `user_${notification.user}`;
        break;
      default:
        throw new Error(`Invalid userType: ${notification.userType}`);
    }

    const fcmNotification = {
      title: notification.title,
      body: notification.description,
    };

    const data = {
      type: notification.type,
      notificationId: notification._id.toString(),
    };

    try {
      await sendToTopic(topic, fcmNotification, data);
      console.log(`Sent notification to topic: ${topic}`);
    } catch (error) {
      console.error('Failed to send FCM notification:', error);
      throw error;
    }
  });
};
