const { sendToTopic } = require('../microservices/notification.service');
const Notification = require('../models/notification.model');
const { User } = require('../models');

module.exports = (agenda) => {
  agenda.define('send push notification', async (job) => {
    const { notificationId } = job.attrs.data;
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      console.log(`Notification ${notificationId} not found`);
      return;
    }
    
    if (notification.type !== 'PUSH') {
      console.log(`Skipping non-PUSH notification ${notificationId}`);
      return;
    }
    
    // console.log('Retrieved notification:', notification);
    
    const fcmNotification = {
      title: notification.title,
      body: notification.description,
    };
    
    const data = {
      type: notification.type,
      notificationId: notification._id.toString(),
    };

    if (notification.userType === 'all') {
      const users = await User.find({}, '_id');
      for (const user of users) {
        const individualTopic = `user_${user._id}`;
        try {
          await sendToTopic(user._id.toString(), individualTopic, fcmNotification, data);
          console.log(`Sent broadcast notification to user ${user._id} on topic: ${individualTopic}`);
        } catch (err) {
          console.error(`Failed to send broadcast notification to user ${user._id}:`, err);
        }
      }
      return;
    }
    
    let topic;
    switch (notification.userType) {
      case 'monthly':
        topic = 'monthly_subscribers';
        break;
      case 'annual':
        topic = 'annual_subscribers';
        break;
      case 'individual':
        if (!notification.userId) {
          throw new Error('Individual notification missing user ID');
        }
        topic = `user_${notification.userId}`;
        break;
      default:
        throw new Error(`Invalid userType: ${notification.userType}`);
    }
    
    try {
      await sendToTopic(notification.userId.toString(), topic, fcmNotification, data);
      console.log(`Sent notification to topic: ${topic}`);
    } catch (error) {
      console.error('Failed to send FCM notification:', error);
      throw error;
    }
  });
};
