const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  Exercise: { type: String, required: true },
  Type: { type: String },
  "Main muscle worked": { type: String },
  Equipment: { type: String },
  "Mechanics type": { type: String },
  Level: { type: String },
  Sport: { type: String },
  Description: { type: String },
  Weight: { type: String }
});

const Exercise = mongoose.model('Exercise', ExerciseSchema);
module.exports = Exercise;

