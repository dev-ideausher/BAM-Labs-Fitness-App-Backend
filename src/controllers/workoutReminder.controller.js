const {WorkoutReminder}= require('../models/workoutReminder.model');
const agenda = require('../config/agenda');
const { sendToTopic } = require('../microservices/notification.service');
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const scheduleWorkoutReminder = async (reminderTime, userId) => {
    const jobName = `workout-reminder-${userId}`;
    
    await agenda.schedule(reminderTime, jobName, {
      userId: userId.toString(),
    });
  
    agenda.define(jobName, async (job) => {
      const { userId } = job.attrs.data;
      
      await sendToTopic(
        userId,
        {
          title: 'Workout Time! 💪',
          body: "It's time for your scheduled workout. Let's get moving!",
        },
        {
          type: 'WORKOUT_REMINDER',
          timestamp: new Date().toISOString()
        }
      );
    });
  };
  
  const createWorkoutReminder = catchAsync(async (req, res) => {
    const { reminderTime } = req.body;
    const userId = req.user._id;
    console.log('Creating reminder:', { userId, reminderTime });
    const existingReminder = await WorkoutReminder.findOne({ userId });
    if (existingReminder) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Reminder already exists. Please delete existing reminder first.');
    }
  
    const reminderDate = new Date(reminderTime);
    if (reminderDate < new Date()) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Reminder time must be in the future');
    }
  
    const workoutReminder = await WorkoutReminder.create({
      userId,
      reminderTime: reminderDate,
    });
    console.log('Reminder created:', { userId, reminderId: workoutReminder._id });
  
    await scheduleWorkoutReminder(reminderDate, userId);
  
    res.status(httpStatus.CREATED).send(workoutReminder);
  });
  
  const deleteWorkoutReminder = catchAsync(async (req, res) => {
    const userId = req.user._id;
    console.log('Deleting reminder for user:', userId);
  
    const reminder = await WorkoutReminder.findOne({ userId });
    console.log('Found reminder:', reminder);
    if (!reminder) {
      throw new ApiError(httpStatus.NOT_FOUND, 'No reminder found');
    }
  
    await agenda.cancel({ name: `workout-reminder-${userId}` });
    await reminder.deleteOne();
    
    res.status(httpStatus.OK).json({ message: "Reminder deleted successfully" });
  });
  
  const getMyReminder = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const reminder = await WorkoutReminder.findOne({ userId });
    
    if (!reminder) {
      throw new ApiError(httpStatus.NOT_FOUND, 'No reminder found');
    }
    
    res.send(reminder);
  });

module.exports = {
  createWorkoutReminder,
  deleteWorkoutReminder,
  getMyReminder
};