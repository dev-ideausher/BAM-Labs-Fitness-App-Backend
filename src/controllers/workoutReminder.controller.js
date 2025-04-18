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
//   try {
//     const jobName = `workout-reminder-${userId}`;
//     // const notificationTime = new Date(reminderTime);
//     const notificationTime = new Date(reminderTime.getTime() - offset * 60000);

//     await agenda.cancel({name: jobName});
//     agenda.define(jobName, async job => {
//       try {
//         const {userId} = job.attrs.data;
//         await sendToTopic(
//           userId,
//           `user_${userId}`,
//           {
//             title: 'Workout Time! 💪',
//             body: "It's time for your scheduled workout. Let's get moving!",
//           },
//           {
//             type: 'WORKOUT_REMINDER',
//             timestamp: new Date().toISOString(),
//           }
//         );
//       } catch (error) {
//         console.error('Error sending workout reminder notification:', error);
//         throw error;
//       }
//     });

//     await agenda.schedule(notificationTime, jobName, {
//       userId: userId.toString(),
//     });
//   } catch (error) {
//     console.error('Error scheduling workout reminder:', error);
//     throw error;
//   }
// };
const scheduleWorkoutReminder = async (reminderTime, offset, userId) => {
  const utcReminderTime = new Date(reminderTime.getTime() - offset * 60000);
  const hour = utcReminderTime.getUTCHours();
  const minute = utcReminderTime.getUTCMinutes();

  const cronTime = `${minute} ${hour} * * *`;

  const jobName = `workout-reminder-${userId}`;

  agenda.define(jobName, async job => {
    const {userId} = job.attrs.data;
    try {
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
  });

  await agenda.cancel({name: jobName});

  await agenda.every(cronTime, jobName, {userId}, {timezone: 'UTC'});

  // console.log(`Scheduled daily workout reminder for user ${userId} at ${hour}:${minute} UTC (Cron: ${cronTime})`);
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
};
