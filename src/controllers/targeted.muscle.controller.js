const {targetedMuscleService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const createTargetedMuscle = catchAsync(async (req, res) => {
  const targetedMuscle = await targetedMuscleService.createTargetedMuscle(req.body);
  res.status(200).json({
    status: true,
    message: 'Targeted Muscle created successfully',
    targetedMuscle,
  });
});

const getAllTargetedMuscles = catchAsync(async (req, res) => {
  const targetedMuscles = await targetedMuscleService.getAllTargetedMuscles(req.query, []);
  if (targetedMuscles && Array.isArray(targetedMuscles.results)) {
    targetedMuscles.results.sort((a, b) => {
      return (a.targetedMuscle || "").localeCompare(b.targetedMuscle || "");
    });
  }
  res.status(200).json({
    status: true,
    message: 'Targeted Muscles fetched successfully',
    targetedMuscles,
  });
});

const getTargetedMuscleById = catchAsync(async (req, res) => {
  const targetedMuscle = await targetedMuscleService.getTargetedMuscleById(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Targeted Muscle fetched successfully',
    targetedMuscle,
  });
});

const updateTargetedMuscleById = catchAsync(async (req, res) => {
  const targetedMuscle = await targetedMuscleService.updateTargetedMuscleById(req.params.id, req.body);
  res.status(200).json({
    status: true,
    message: 'Targeted Muscle updated successfully',
    targetedMuscle,
  });
});

const deleteTargetedMuscleById = catchAsync(async (req, res) => {
  await targetedMuscleService.deleteTargetedMuscleById(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Targeted Muscle deleted successfully',
  });
});

module.exports = {
  createTargetedMuscle,
  getAllTargetedMuscles,
  getTargetedMuscleById,
  updateTargetedMuscleById,
  deleteTargetedMuscleById,
};
