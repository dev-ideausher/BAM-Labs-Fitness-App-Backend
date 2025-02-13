const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');
const {scheduleHabitNotifications} = require('../Jobs/habitNotifications');

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
    offset: {
      type: Number,
      required: true,
    },
  },

  {timestamps: true}
);
 userHabitSchma.index({ userId: 1 });
 userHabitSchma.index({ habitId: 1 });
 
 userHabitSchma.pre('save', async function(next) {
  try {
    if (this.isModified('notificationToggle') && !this.notificationToggle) {
      await this.constructor.cancelHabitNotifications(this._id);
    }
    next();
  } catch (error) {
    next(error);
  }
});

 userHabitSchma.post('save', async function(doc) {
  try {
    if (doc.notificationToggle) {
      const populatedDoc = await doc.populate('habitId');
      const habitData = {
        ...doc.toObject(),
        habitName: populatedDoc.habitId.name
      };
      await scheduleHabitNotifications(habitData);
    }
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
});

 userHabitSchma.pre('remove', async function() {
  try {
    await this.constructor.cancelHabitNotifications(this._id);
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
});

 userHabitSchma.statics.cancelHabitNotifications = async function(habitId) {
  const agenda = require('../config/agenda');
  await agenda.cancel({'data.habitId': habitId});
};

userHabitSchma.plugin(paginate);

const UserHabit = mongoose.model('UserHabit', userHabitSchma);

module.exports = {UserHabit};
