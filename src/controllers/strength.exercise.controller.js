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
  //  req.body.userId = req.user._id;
  const exercise = await strengthExerciseService.createCustomStrenghtExercise({...req.body, userId: req.user._id});
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
     sort: 'exerciseName'
  };

  const exercises = await strengthExerciseService.getAllExercises({
    $or: [
      { __t: null },
      { __t: 'CustomStrengthExercise', userId: req.user._id },
      { __t: 'CustomStrengthExercise', publicVisibility: true }
    ],
    ...query
  }, []);

  const customExercises = await strengthExerciseService.getUserCustomExercises(req.user._id, query, []);

  res.status(200).json({
    status: true,
    message: 'Exercises fetched successfully',
    exercises,
    customExercises,
  });
});

const getExerciseById = catchAsync(async (req, res) => {
  const exercise = await strengthExerciseService.getExerciseById(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Exercise fetched successfully',
    exercise,
  });
});

const deleteCustomExercise = catchAsync(async (req, res) => {
  const { id } = req.params;
  const exercise = await strengthExerciseService.deleteCustomExercise(id, req.user._id);
  if (!exercise) {
    return res.status(404).json({
      status: false,
      message: 'Custom Exercise not found or not authorized'
    });
  }
  res.status(200).json({
    status: true,
    message: 'Custom Exercise deleted successfully'
  });
});


module.exports = {
  createExercise,
  createCustomExercise,
  getAllExercises,
  getExerciseById,
  deleteCustomExercise
};
