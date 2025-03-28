const {trackerService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const getStrengthContent = catchAsync(async (req, res) => {
  const data = await trackerService.getStrengthContent();
  res.status(200).json({
    status: true,
    message: 'Strength content fetched successfully',
    data: data,
  });
});

const getAllHabits = catchAsync(async (req, res) => {
  const {page, limit} = req.query;
  const data = await trackerService.getAllHabits({page, limit});
  res.status(200).json({
    status: true,
    message: 'Habits fetched successfully',
    data: data,
  });
});
const createNewHabit = catchAsync(async (req, res) => {
  const {name} = req.body;
  const habit = await trackerService.createNewHabit({name});
  res.status(200).json({
    status: true,
    message: 'Habit created successfully',
    habit: habit,
  });
});

const updateHabit = catchAsync(async (req, res) => {
  const {id} = req.params;
  const {name} = req.body;
  const habit = await trackerService.updateHabit({id, name});
  res.status(200).json({
    status: true,
    message: 'Habit updated successfully',
    habit: habit,
  });
});

const deleteHabit = catchAsync(async (req, res) => {
  const {id} = req.params;
  const habit = await trackerService.deleteHabit({id});
  res.status(200).json({
    status: true,
    message: 'Habit deleted successfully',
    habit: habit,
  });
});

// create new strength content
const createStrengthContent = catchAsync(async (req, res) => {
  const {name, image, targetMuscle} = req.body;
  const strengthContent = await trackerService.createStrengthContent({name, image, targetMuscle});
  res.status(200).json({
    status: true,
    message: 'Strength content created successfully',
    strengthContent,
  });
});

const getSpecificCategory = catchAsync(async (req, res) => {
  const {id} = req.params;
  const data = await trackerService.getSpecificCategory(id);
  res.status(200).json({
    status: true,
    message: 'Strength content fetched successfully',
    data: data,
  });
});

const updateMuscleExcercise = catchAsync(async (req, res) => {
  const {type, id, name, video, metrices} = req.body;
  const strengthContent = await trackerService.updateMuscleExcercise({type, id, name, video, metrices});
  res.status(200).json({
    status: true,
    message: 'Strength content updated successfully',
    strengthContent,
  });
});

const deleteMuscle = catchAsync(async (req, res) => {
  const {id} = req.params;
  const strengthContent = await trackerService.deleteMuscle(id);
  res.status(200).json({
    status: true,
    message: 'Strength content muscle deleted successfully',
    strengthContent,
  });
});

const deleteExcercise = catchAsync(async (req, res) => {
  const {id} = req.params;
  const strengthContent = await trackerService.deleteExcercise(id);
  res.status(200).json({
    status: true,
    message: 'Strength content excercise deleted successfully',
    strengthContent,
  });
});

const deleteStrengthContent = catchAsync(async (req, res) => {
  const {id} = req.params;
  const strengthContent = await trackerService.deleteStrengthContent({id});
  res.status(200).json({
    status: true,
    message: 'Strength content deleted successfully',
    data: strengthContent,
  });
});

const updateVideo = catchAsync(async (req, res) => {
  const {excerciseId} = req.params;
  const {video} = req.body;
  const updatedVideo = await trackerService.updateVideo(excerciseId, video);
  res.status(200).json({
    status: true,
    message: 'Video updated successfully',
    updatedVideo,
  });
});

const addExerciseForMuscle = catchAsync(async (req, res) => {
  const {id, name, video, metrices} = req.body;
  const exercise = await trackerService.addExerciseForMuscle({id, name, video, metrices});
  res.status(201).json({
    status: true,
    message: 'Exercise added successfully to the muscle',
    exercise,
  });
});

const addMuscleToPrimaryCategory = catchAsync(async (req, res) => {
  const {categoryId, muscleName} = req.body;

  const muscle = await trackerService.addMuscleToPrimaryCategory({categoryId, muscleName});

  res.status(201).json({
    status: true,
    message: 'Muscle added successfully to the primary category',
    muscle,
  });
});

module.exports = {
  getStrengthContent,
  getAllHabits,
  getSpecificCategory,
  createNewHabit,
  updateHabit,
  createStrengthContent,
  deleteHabit,
  updateMuscleExcercise,
  deleteMuscle,
  deleteExcercise,
  updateVideo,
  deleteStrengthContent,
  addExerciseForMuscle,
  addMuscleToPrimaryCategory,
};
