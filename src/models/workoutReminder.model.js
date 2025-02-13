const mongoose = require('mongoose');

const workoutReminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reminderTime: {
      type: Date,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    offset: {
      type: Number,
      required: true,
    },
  },
  {timestamps: true}
);

const WorkoutReminder = mongoose.model('WorkoutReminder', workoutReminderSchema);

module.exports = {WorkoutReminder};
