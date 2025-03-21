const {sendEmail} = require('../microservices/mail.service');
const {getNotificationEmailTemplate} = require('../microservices/emailTemplates.service');
const Notification = require('../models/notification.model');
const {User} = require('../models');

module.exports = agenda => {
  agenda.define('send email notification', async job => {
    const {notificationId} = job.attrs.data;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      console.error(`Notification not found: ${notificationId}`);
      return;
    }

    const {title, description, userType, userId} = notification;

    const htmlTemplate = getNotificationEmailTemplate({title, description});

    if (userType === 'individual') {
      const user = await User.findById(userId);
      if (user && user.email) {
        await sendEmail({
          to: user.email,
          subject: title,
          html: htmlTemplate,
        });
      } else {
        console.error(`Email not found for user: ${userId}`);
      }
    } else if (userType === 'all') {
      const users = await User.find({});
      for (const user of users) {
        if (user.email) {
          await sendEmail({
            to: user.email,
            subject: title,
            html: htmlTemplate,
          });
        }
      }
    }
  });
};
