const mongoose = require('mongoose');

const userHabitLogSchema = new mongoose.Schema(
  {
    userHabitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserHabit',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['completed', 'skipped', 'missed'],
      required: true,
      default: 'completed',
    },
    notes: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const UserHabitLog = mongoose.model('UserHabitLog', userHabitLogSchema);

module.exports = { UserHabitLog };
