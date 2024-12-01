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
    },
    weeklyCount: {
      type: Number,
      required: false,
    },
    monthlyCount: {
      type: Number,
      required: false,
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
  },
  {timestamps: true}
);

userHabitSchma.plugin(paginate);

const UserHabit = mongoose.model('UserHabit', userHabitSchma);

module.exports = {UserHabit};
