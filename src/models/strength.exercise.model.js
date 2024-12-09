const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const strengthExerciseSchema = new mongoose.Schema(
  {
    primaryCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrimaryCategory',
      required: true,
    },
    targetedMuscle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TargetedMuscle',
      required: true,
    },
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {timestamps: true}
);

const customStrengthExerciseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publicVisibility: {
      type: Boolean,
      default: false,
    },
  },
  {timestamps: true}
);

strengthExerciseSchema.plugin(paginate);
customStrengthExerciseSchema.plugin(paginate);

const StrengthExercise = mongoose.model('StrengthExercise', strengthExerciseSchema);
const CustomStrengthExercise = StrengthExercise.discriminator('CustomStrengthExercise', customStrengthExerciseSchema);

module.exports = {
  StrengthExercise,
  CustomStrengthExercise,
};
