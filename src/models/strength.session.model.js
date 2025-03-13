const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const strengthSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    exerciseId: {
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
      required: false,
    },
    reps: {
      type: Number,
      required: false,
    },
    totalReps: {
      type: Number,
      required: false,
    },
    sessionTime: {
      type: Number,
      required: false,
    },
    totalWeight: {
      type: Number,
      default: 0,
    },
  },
  {timestamps: true}
);

const strengthBestSessionSchema = new mongoose.Schema(
  {
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
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StrengthExercise',
      required: true,
    },
  },
  {timestamps: true}
);

strengthSessionSchema.plugin(paginate);
strengthBestSessionSchema.plugin(paginate);

const StrengthSession = mongoose.model('StrengthSession', strengthSessionSchema);
const StrengthBestSession = mongoose.model('StrengthBestSession', strengthBestSessionSchema);

module.exports = {StrengthSession, StrengthBestSession};
