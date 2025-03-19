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
      ref: 'TargetedMuscles',
      required: true,
    },
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },
    metrices: {
      type: Array,
      enums: ["date", "sessionTime", "reps", "sets", "weight", "totalReps","totalWeight"],
      required: true,
      default: ["date", "sessionTime", "reps", "sets", "weight", "totalReps", "totalWeight"],
      set: function (value) {
        if (Array.isArray(value) && !value.includes("totalWeight")) {
          return [...value, "totalWeight"];
        }
        return value;
      }
    },
    video:{
      key: {
        type:String,
        // required:true
      },
      url: {
        type:String,
        // required:true
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
