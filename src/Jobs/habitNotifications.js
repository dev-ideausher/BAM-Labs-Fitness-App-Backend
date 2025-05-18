const agenda = require('../config/agenda');
const {sendToTopic} = require('../microservices/notification.service');

const scheduleHabitNotifications = async userHabit => {
  if (!userHabit.notificationToggle || !userHabit.taskType) return;

  try {
    await agenda.cancel({'data.habitId': userHabit._id});

    if (userHabit.taskType && userHabit.customNotificationTimes?.length) {
      const jobs = [];

      for (const time of userHabit.customNotificationTimes) {
        let date = new Date(time);
        if (userHabit.offset) {
          date = new Date(date.getTime() - userHabit.offset * 60000);
        }
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

          if (!agenda._definitions[jobName]) {
            agenda.define(jobName, async job => {
              const {userId, habitId, message, notificationType} = job.attrs.data;
              try {
                const {UserHabit} = require('../models');
                const habit = await UserHabit.findById(habitId);
                if (!habit || !habit.notificationToggle) {
                  await agenda.cancel({'data.habitId': habitId});
                  return;
                }
                await sendToTopic(
                  userId,
                  `user_${userId}`,
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
          }
          const job = await agenda.every(
            pattern,
            jobName,
            {
              userId: userHabit.userId,
              habitId: userHabit._id,
              message: `Time to perform "${userHabit.habitName}"!`,
              notificationType: 'regular_reminder',
              uniqueJobId,
              scheduledTime: time,
            },
            {
              timezone: 'UTC',
              unique: {'data.uniqueJobId': uniqueJobId},
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

const checkAndRepairHabitSchedules = async () => {
  try {
    console.log('Running habit notification schedule health check...');

    const {UserHabit} = require('../models');
    const habitsWithNotifications = await UserHabit.find({
      notificationToggle: true,
      status: 'active',
    }).populate('habitId', 'name');

    console.log(`Found ${habitsWithNotifications.length} habits with active notifications`);
    const now = new Date();

    for (const habit of habitsWithNotifications) {
      try {
        const habitJobs = await agenda.jobs({'data.habitId': habit._id});

        const expectedJobCount = habit.customNotificationTimes?.length || 0;

        if (habitJobs.length !== expectedJobCount) {
          console.warn(
            `Mismatch in notification jobs for habit ${habit._id} (${habit.habitId.name}). ` +
              `Found ${habitJobs.length} jobs, expected ${expectedJobCount}. Rescheduling...`
          );

          await agenda.cancel({'data.habitId': habit._id});

          const habitData = {
            ...habit.toObject(),
            habitName: habit.habitId.name,
          };

          await scheduleHabitNotifications(habitData);
        } else {
          let hasStaleJobs = false;

          for (const job of habitJobs) {
            if (!job.attrs.nextRunAt || new Date(job.attrs.nextRunAt) < now) {
              hasStaleJobs = true;
              console.warn(
                `Stale job found for habit ${habit._id} (${habit.habitId.name}). ` +
                  `Job ID: ${job.attrs._id}, ` +
                  `NextRunAt: ${job.attrs.nextRunAt ? new Date(job.attrs.nextRunAt).toISOString() : 'undefined'}`
              );
              break;
            }
          }

          if (hasStaleJobs) {
            console.warn(`Rescheduling all jobs for habit ${habit._id} due to stale job(s)...`);

            await agenda.cancel({'data.habitId': habit._id});

            const habitData = {
              ...habit.toObject(),
              habitName: habit.habitId.name,
            };

            await scheduleHabitNotifications(habitData);
          } else {
            const nextRunTimes = habitJobs.map(job => new Date(job.attrs.nextRunAt).toISOString());

            console.log(
              `Habit notification for habit ${habit._id} (${habit.habitId.name}) is healthy. ` +
                `Found ${habitJobs.length} scheduled notification(s). ` +
                `Next runs at: ${nextRunTimes.join(', ')}`
            );
          }
        }
      } catch (habitError) {
        console.error(`Error checking habit ${habit._id}:`, habitError);
      }
    }

    console.log('Habit notification schedule health check completed');
  } catch (error) {
    console.error('Error during habit notification schedule health check:', error);
  }
};

module.exports = {
  scheduleHabitNotifications,
  cancelHabitNotifications: async habitId => {
    await agenda.cancel({'data.habitId': habitId});
  },
  checkAndRepairHabitSchedules,
};
