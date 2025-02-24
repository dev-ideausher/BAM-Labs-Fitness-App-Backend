const mongoose = require('mongoose');

const workoutStateSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  assistantId: String,
  threadId: String,
  vectorStoreId: String,
  createdAt: {type: Date, default: Date.now},
});

const WorkoutState = mongoose.model('WorkoutState', workoutStateSchema);

module.exports = {WorkoutState};
