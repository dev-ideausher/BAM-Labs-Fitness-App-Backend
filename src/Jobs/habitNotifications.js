const agenda = require('../config/agenda');
const {sendToTopic} = require('../microservices/notification.service');

const scheduleHabitNotifications = async userHabit => {
  if (!userHabit.notificationToggle || !userHabit.taskType) {
    return;
  }

  try {
    await agenda.cancel({'data.habitId': userHabit._id});

    if (userHabit.taskType && userHabit.customNotificationTimes?.length) {
      const jobs = [];

      for (const time of userHabit.customNotificationTimes) {
        const date = new Date(time);
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        let pattern;

        switch (userHabit.taskType) {
          case 'daily':
            if (userHabit.taskDays === 'everyday') {
              pattern = `${minutes} ${hours} * * *`;
            } else if (userHabit.taskDays === 'specific-weekdays' && userHabit.specificWeekdays?.length) {
              const weekdays = userHabit.specificWeekdays.sort().join(',');
              pattern = `${minutes} ${hours} * * ${weekdays}`;
            }
            break;

          case 'weekly':
            if (userHabit.taskDays === 'weekly-count' && userHabit.weeklyCount) {
              const startDay = new Date().getUTCDay();
              const days = [];
              for (let i = 0; i < userHabit.weeklyCount; i++) {
                days.push((startDay + i) % 7);
              }
              const weekdays = days.sort().join(',');
              pattern = `${minutes} ${hours} * * ${weekdays}`;
            }
            break;

          case 'monthly':
            if (userHabit.taskDays === 'monthly-count' && userHabit.monthlyCount) {
              const days = Array.from({length: userHabit.monthlyCount}, (_, i) => i + 1).join(',');
              pattern = `${minutes} ${hours} ${days} * *`;
            }
            break;
        }

        if (pattern) {
          const jobName = `send-habit-reminder-${userHabit._id}-${hours}-${minutes}`;
          const uniqueJobId = `${userHabit.userId}-${userHabit._id}-${hours}-${minutes}`;

          const job = await agenda.every(
            pattern,
            jobName,
            {
              userId: userHabit.userId,
              habitId: userHabit._id,
              message: `Time to perform "${userHabit.habitName}"!`,
              notificationType: 'regular_reminder',
              uniqueJobId: uniqueJobId,
              scheduledTime: time,
            },
            {
              timezone: 'UTC',
              unique: {
                'data.uniqueJobId': uniqueJobId,
              },
            }
          );

          jobs.push(job);
        }
      }
    }
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    throw error;
  }
};

agenda.define('send-habit-reminder-*', async job => {
  const {userId, habitId, message, notificationType} = job.attrs.data;

  try {
    const UserHabit = require('../models').UserHabit;
    const habit = await UserHabit.findById(habitId);

    if (!habit || !habit.notificationToggle) {
      await agenda.cancel({'data.habitId': habitId});
      return;
    }

    await sendToTopic(
      userId.toString(),
      {
        title: 'Habit Reminder',
        body: message,
      },
      {
        habitId: habitId.toString(),
        type: notificationType,
      }
    );

    console.log(`Notification sent for habit ${habitId} at ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`Error sending notification for habit ${habitId}:`, error);
  }
});

module.exports = {
  scheduleHabitNotifications,
  cancelHabitNotifications: async habitId => {
    await agenda.cancel({'data.habitId': habitId});
  },
};


