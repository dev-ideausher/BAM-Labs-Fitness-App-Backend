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

//   agenda.define(jobName, async job => {
//     const {userId} = job.attrs.data;
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

//   await agenda.cancel({name: jobName});

//   await agenda.every(cronTime, jobName, {userId}, {timezone: 'UTC'});

//   // console.log(`Scheduled daily workout reminder for user ${userId} at ${hour}:${minute} UTC (Cron: ${cronTime})`);
// };
const scheduleWorkoutReminder = async (reminderTime, offset, userId) => {
  const utcReminderTime = new Date(reminderTime.getTime() - offset * 60000);
  const hour = utcReminderTime.getUTCHours();
  const minute = utcReminderTime.getUTCMinutes();

  const cronTime = `${minute} ${hour} * * *`;

  const jobName = `workout-reminder-${userId}`;

  console.log(`Scheduling workout reminder for user ${userId} at ${hour}:${minute} UTC (Cron: ${cronTime})`);

  await agenda.cancel({ name: jobName });
  console.log(`Canceled any existing reminder job for user ${userId}`);
  agenda.define(jobName, async (job) => {
    const { userId } = job.attrs.data;
    try {
      console.log(`Executing workout reminder for user ${userId}`);

      await sendToTopic(
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
      console.log(`Workout reminder notification sent for user ${userId}`);
    } catch (error) {
      console.error(`Error sending workout reminder for user ${userId}:`, error);
    }
    
    if (!job.attrs.nextRunAt) {
      console.log(`No next run scheduled for job ${jobName}. Attempting to reschedule.`);
      job.repeatEvery(cronTime, { timezone: 'UTC' });
      await job.save();
      console.log(`Job rescheduled. Next run at: ${job.attrs.nextRunAt}`);
    } else {
      console.log(`Next run already scheduled for: ${job.attrs.nextRunAt}`);
    }
  });

  const existingJob = await agenda.jobs({ name: jobName });
  console.log(`Found ${existingJob.length} existing job(s) for user ${userId}`);

  const job = agenda.create(jobName, { userId });
  job.repeatEvery(cronTime, { timezone: 'UTC' });

  try {
    await job.save();
    console.log(`Job saved successfully. Job ID: ${job.attrs._id}`);
    console.log(`Job type: ${job.attrs.type}`);
    console.log(`Next run scheduled for: ${job.attrs.nextRunAt}`);
  } catch (err) {
    console.error(`Failed to save job: ${err.message}`);
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
  scheduleWorkoutReminder
};
