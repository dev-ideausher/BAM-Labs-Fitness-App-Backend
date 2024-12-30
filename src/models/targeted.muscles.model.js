const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const targetedMuscleSchema = new mongoose.Schema(
  {
    targetedMuscle: {
      type: String,
      required: true,
      trim: true,
    },
    primaryCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrimaryCategory',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {timestamps: true}
);

targetedMuscleSchema.plugin(paginate);

const TargetedMuscle = mongoose.model('TargetedMuscles', targetedMuscleSchema);

module.exports = {
  TargetedMuscle,
};
