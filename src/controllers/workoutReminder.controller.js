const {WorkoutReminder} = require('../models/workoutReminder.model');
const agenda = require('../config/agenda');
const {sendToTopic} = require('../microservices/notification.service');
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const createWorkoutReminder = catchAsync(async (req, res) => {
  const {reminderTime, offset} = req.body;
  const userId = req.user._id;

  const existingReminder = await WorkoutReminder.findOne({userId});
  if (existingReminder) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reminder already exists. Please delete the existing reminder first.');
  }

  const reminderDate = new Date(reminderTime);
  if (reminderDate < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reminder time must be in the future');
  }

  if (offset < -720 || offset > 840) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid timezone offset');
  }

  const workoutReminder = await WorkoutReminder.create({
    userId,
    reminderTime: reminderDate,
    offset,
  });

  await scheduleWorkoutReminder(reminderDate, offset, userId);

  res.status(httpStatus.CREATED).send(workoutReminder);
});

// const scheduleWorkoutReminder = async (reminderTime, offset, userId) => {
//   const utcReminderTime = new Date(reminderTime.getTime() - offset * 60000);
//   const hour = utcReminderTime.getUTCHours();
//   const minute = utcReminderTime.getUTCMinutes();

//   const cronTime = `${minute} ${hour} * * *`;
//   const jobName = `workout-reminder-${userId}`;

//   agenda.define(jobName, async (job) => {
//     const { userId } = job.attrs.data;
//     try {
//       await sendToTopic(
//         userId,
//         `user_${userId}`,
//         {
//           title: 'Workout Time! 💪',
//           body: "It's time for your scheduled workout. Let's get moving!",
//         },
//         {
//           type: 'WORKOUT_REMINDER',
//           timestamp: new Date().toISOString(),
//         }
//       );
//       console.log(`Workout reminder notification sent for user ${userId}`);
//     } catch (error) {
//       console.error(`Error sending workout reminder for user ${userId}:`, error);
//     }
//   });

//   await agenda.cancel({ name: jobName });

//   await agenda.every(cronTime, jobName, { userId }, { timezone: 'UTC' });

//   console.log(
//     `Scheduled daily workout reminder for user ${userId} at ${hour}:${minute} UTC (Cron: ${cronTime})`
//   );
// };

const scheduleWorkoutReminder = async (reminderTime, offset, userId) => {
  const utcReminderTime = new Date(reminderTime.getTime() - offset * 60000);
  const hour = utcReminderTime.getUTCHours();
  const minute = utcReminderTime.getUTCMinutes();

  const cronTime = `${minute} ${hour} * * *`;
  const jobName = `workout-reminder-${userId}`;

  console.log(`Scheduling workout reminder for user ${userId} at ${hour}:${minute} UTC (Cron: ${cronTime})`);

  const jobHandler = async job => {
    const {userId} = job.attrs.data;
    try {
      console.log(`Executing workout reminder for user ${userId}`);

      const notificationResult = await sendToTopic(
        userId,
        `user_${userId}`,
        {
          title: 'Workout Time! 💪',
          body: "It's time for your scheduled workout. Let's get moving!",
        },
        {
          type: 'WORKOUT_REMINDER',
          timestamp: new Date().toISOString(),
        }
      );

      if (notificationResult) {
        console.log(
          `Workout reminder notification sent for user ${userId} with response:`,
          typeof notificationResult === 'object' ? JSON.stringify(notificationResult) : notificationResult
        );

        job.attrs.failCount = 0;
        await job.save();
      } else {
        console.warn(`Workout reminder attempted for user ${userId} but no response received`);
        throw new Error('No response received from sendToTopic');
      }
    } catch (error) {
      job.attrs.failCount = (job.attrs.failCount || 0) + 1;

      const maxRetries = 3;
      const retryDelays = [1, 5, 15];

      if (job.attrs.failCount <= maxRetries) {
        const retryIndex = job.attrs.failCount - 1;
        const retryDelay = retryDelays[retryIndex] || retryDelays[retryDelays.length - 1];
        const nextRetry = new Date(Date.now() + retryDelay * 60000);

        console.log(
          `Retry ${job.attrs.failCount}/${maxRetries} for user ${userId} scheduled at ${nextRetry.toISOString()}`
        );

        job.attrs.nextRunAt = nextRetry;
        await job.save();
      } else {
        console.error(`All retry attempts failed for user ${userId}. Last error:`, error);

        try {
          await logNotificationFailure({
            userId,
            jobName,
            failCount: job.attrs.failCount,
            lastError: error.message || 'Unknown error',
            timestamp: new Date(),
          });
        } catch (logError) {
          console.error(`Failed to log notification failure for user ${userId}:`, logError);
        }

        job.attrs.failCount = 0;
        await job.save();
      }
    }
  };

  try {
    await agenda.cancel({name: jobName});
    console.log(`Canceled any existing reminder job for user ${userId}`);

    const definitions = agenda._definitions;
    const isJobDefined = definitions[jobName] !== undefined;

    if (!isJobDefined) {
      agenda.define(jobName, {concurrency: 1}, jobHandler);
      console.log(`Defined new job handler for ${jobName}`);
    }

    await agenda.every(cronTime, jobName, {userId}, {timezone: 'UTC'});
    console.log(
      `Successfully scheduled daily workout reminder for user ${userId} at ${hour}:${minute} UTC (Cron: ${cronTime})`
    );

    const scheduledJobs = await agenda.jobs({name: jobName});
    if (scheduledJobs.length === 0) {
      throw new Error(`Failed to schedule workout reminder for user ${userId}`);
    }
    console.log(`Verified ${scheduledJobs.length} job(s) exist for user ${userId}`);
  } catch (error) {
    console.error(`Failed to schedule workout reminder for user ${userId}:`, error);
    throw error;
  }
};

const logNotificationFailure = async failureData => {
  console.error('NOTIFICATION FAILURE:', failureData);
  return true;
};

const checkAndRepairSchedules = async () => {
  try {
    console.log('Running schedule health check...');

    const users = await getUsersWithWorkoutReminders();
    const now = new Date();

    for (const user of users) {
      const jobName = `workout-reminder-${user.id}`;
      const scheduledJobs = await agenda.jobs({name: jobName});

      if (scheduledJobs.length === 0) {
        console.warn(`Missing workout reminder job for user ${user.id}. Rescheduling...`);
        await scheduleWorkoutReminder(new Date(user.reminderTime), user.timezoneOffset, user.id);
        continue;
      }

      const job = scheduledJobs[0];
      if (!job.attrs.nextRunAt || new Date(job.attrs.nextRunAt) < now) {
        console.warn(`Stale job found for user ${user.id}. Rescheduling...`);
        await agenda.cancel({name: jobName});
        await scheduleWorkoutReminder(new Date(user.reminderTime), user.timezoneOffset, user.id);
      } else {
        console.log(
          `Workout reminder for user ${user.id} is healthy. Next run at: ${new Date(job.attrs.nextRunAt).toISOString()}`
        );
      }
    }

    console.log('Schedule health check completed');
  } catch (error) {
    console.error('Error during schedule health check:', error);
  }
};
const getUsersWithWorkoutReminders = async () => {
  try {
    const reminders = await WorkoutReminder.find({isEnabled: true}).populate('userId', 'id reminderTime offset');
    const valid = reminders.filter(r => r.userId);

    return valid.map(reminder => ({
      id: reminder.userId.id,
      reminderTime: reminder.reminderTime,
      timezoneOffset: reminder.offset,
    }));
  } catch (error) {
    console.error('Error fetching users with workout reminders:', error);
    throw new Error('Failed to fetch users with workout reminders');
  }
};

const deleteWorkoutReminder = catchAsync(async (req, res) => {
  const userId = req.user._id;
  console.log('Deleting reminder for user:', userId);

  const reminder = await WorkoutReminder.findOne({userId});
  console.log('Found reminder:', reminder);
  if (!reminder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No reminder found');
  }

  await agenda.cancel({name: `workout-reminder-${userId}`});
  await reminder.deleteOne();

  res.status(httpStatus.OK).json({message: 'Reminder deleted successfully'});
});

const getMyReminder = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const reminder = await WorkoutReminder.findOne({userId});

  if (!reminder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No reminder found');
  }

  res.send(reminder);
});

module.exports = {
  createWorkoutReminder,
  deleteWorkoutReminder,
  getMyReminder,
  scheduleWorkoutReminder,
  checkAndRepairSchedules,
};
