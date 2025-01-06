const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const userHabitSchma = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
    },
    taskType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    taskDays: {
      type: String,
      enum: ['everyday', 'specific-weekdays', 'weekly-count', 'monthly-count'],
      required: true,
    },
    specificWeekdays: {
      type: [Number],
      required: false,
      default: null,
    },
    weeklyCount: {
      type: Number,
      required: false,
      default: null,
    },
    monthlyCount: {
      type: Number,
      required: false,
      default: null,
    },
    numberOfTimes: {
      type: Number,
      required: true,
    },
    customTimes: {
      type: [String],
      required: false,
    },
    notificaions: {
      type: Boolean,
      default: false,
    },
    customReminder: {
      type: Boolean,
      default: false,
    },
    notificationToggle: {
      type: Boolean,
      default: false,
    },
    customNotificationTimes: {
      type: [Date],
      validate: {
        validator: function(times) {
          return times.every(time => !isNaN(new Date(time).getTime()));
        },
        message: 'Each time in customNotificationTimes must be a valid timestamp.',
      },
    },

    customNotificationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },

  {timestamps: true}
);

userHabitSchma.plugin(paginate);

const UserHabit = mongoose.model('UserHabit', userHabitSchma);

module.exports = {UserHabit};
