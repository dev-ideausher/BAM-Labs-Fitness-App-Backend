const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const strengthSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  exercisrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StrengthExercise',
    required: true,
  },
  dateTime: {
    type: Date,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  sets: {
    type: Number,
    required: true,
  },
  reps: {
    type: Number,
    required: true,
  },
  totalReps: {
    type: Number,
    required: true,
  },
  sessionTime: {
    type: Number,
    required: true,
  },
});

const strengthBestSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StrengthSession',
    required: true,
  },
});

strengthSessionSchema.plugin(paginate);
strengthBestSessionSchema.plugin(paginate);

const StrengthSession = mongoose.model('StrengthSession', strengthSessionSchema);
const StrengthBestSession = mongoose.model('StrengthBestSession', strengthBestSessionSchema);

module.exports = {StrengthSession, StrengthBestSession};
