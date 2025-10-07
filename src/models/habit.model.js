const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const habitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
  },
  {timestamps: true}
);

const customHabitSchema = new mongoose.Schema(
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

habitSchema.plugin(paginate);
customHabitSchema.plugin(paginate);

const Habit = mongoose.model('Habit', habitSchema);
const CustomHabit = Habit.discriminator('CustomHabit', customHabitSchema);

module.exports = {Habit, CustomHabit};
