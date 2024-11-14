const catchAsync = require('../utils/catchAsync');
const {strengthExerciseService} = require('../services');

const createExercise = catchAsync(async (req, res) => {
  const exercise = await strengthExerciseService.createStrenghtExercise(req.body);
  res.status(200).json({
    status: true,
    message: 'Exercise created successfully',
    exercise,
  });
});

const createCustomExercise = catchAsync(async (req, res) => {
  const exercise = await strengthExerciseService.createCustomStrenghtExercise(req.body);
  res.status(200).json({
    status: true,
    message: 'Custom Exercise created successfully',
    exercise,
  });
});

const getAllExercises = catchAsync(async (req, res) => {
  const query = {
    ...req.query,
    page: req.query.page || 1,
    limit: req.query.limit || 10,
  };
  const exercises = await strengthExerciseService.getAllExercises(query, []);
  const customExercises = await strengthExerciseService.getUserCustomExercises(req.user._id, query, []);
  res.status(200).json({
    status: true,
    message: 'Exercises fetched successfully',
    exercises,
    customExercises,
  });
});

module.exports = {
  createExercise,
  createCustomExercise,
  getAllExercises,
};
