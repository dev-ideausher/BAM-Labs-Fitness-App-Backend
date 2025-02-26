const {TargetedMuscle} = require('../models');
const {getAllData} = require('../utils/getAllData');

const createTargetedMuscle = async targetedMuscle => {
  return await TargetedMuscle.create(targetedMuscle);
};

const getAllTargetedMuscles = async (query, populateConfig) => {
  query.sort = 'name';
  return await getAllData(TargetedMuscle, query, populateConfig);
};

const getTargetedMuscleById = async id => {
  return await TargetedMuscle.findById(id);
};

const updateTargetedMuscleById = async (id, update) => {
  return await TargetedMuscle.findByIdAndUpdate(id, update);
};

const deleteTargetedMuscleById = async id => {
  return await TargetedMuscle.findByIdAndDelete(id);
};

module.exports = {
  createTargetedMuscle,
  getAllTargetedMuscles,
  getTargetedMuscleById,
  updateTargetedMuscleById,
  deleteTargetedMuscleById,
};
