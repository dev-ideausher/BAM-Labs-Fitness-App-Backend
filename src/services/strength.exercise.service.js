const {StrengthExercise, CustomStrengthExercise} = require('../models');
const {getAllData} = require('../utils/getAllData');

const createStrenghtExercise = async strenghtExercise => {
  return await StrengthExercise.create(strenghtExercise);
};

const createCustomStrenghtExercise = async strenghtExercise => {
  return await CustomStrengthExercise.create(strenghtExercise);
};

const getAllExercises = async (query, populateConfig) => {
  const data = await getAllData(StrengthExercise, query, populateConfig);
  return data;
};

const getExerciseById = async id => {
  return await StrengthExercise.findById(id)
    .populate('primaryCategory', '-createdAt -updatedAt -isDeleted')
    .populate('targetedMuscle', '-createdAt -updatedAt -isDeleted');
};

const getUserCustomExercises = async (userId, query, populateConfig) => {
  // const data = await getAllData(CustomStrengthExercise, query, populateConfig);
  const data = await getAllData(CustomStrengthExercise, {userId, ...query}, populateConfig);
  // console.log(data);
  return data;
};

const getCustomExerciseById = async id => {
  return await CustomStrengthExercise.findById(id);
};

const updateExerciseById = async (id, update) => {
  return await StrengthExercise.findByIdAndUpdate(id, update, {new: true});
};
const deleteCustomExercise = async (exerciseId, userId) => {
  const exercise = await CustomStrengthExercise.findOne({_id: exerciseId, userId});
  if (!exercise) {
    return null;
  }
  await exercise.deleteOne();

  return exercise;
};

module.exports = {
  createStrenghtExercise,
  createCustomStrenghtExercise,
  getAllExercises,
  getExerciseById,
  getUserCustomExercises,
  getCustomExerciseById,
  updateExerciseById,
  deleteCustomExercise,
};
