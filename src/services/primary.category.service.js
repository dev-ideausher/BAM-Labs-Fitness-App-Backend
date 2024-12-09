const {PrimaryCategory, StrengthExercise} = require('../models');

const createPrimaryCategory = async primaryCategory => {
  return await PrimaryCategory.create(primaryCategory);
};

const getAllPrimaryCategories = async () => {
  return await PrimaryCategory.find();
};

const getPrimaryCategoryById = async id => {
  return await PrimaryCategory.findById(id);
};

const updatePrimaryCategoryById = async (id, update) => {
  return await PrimaryCategory.findByIdAndUpdate(id, update);
};

const deletePrimaryCategoryById = async id => {
  await PrimaryCategory.findByIdAndDelete(id);
  await StrengthExercise.deleteMany({primaryCategory: id});
  return true;
};

module.exports = {
  createPrimaryCategory,
  getAllPrimaryCategories,
  getPrimaryCategoryById,
  updatePrimaryCategoryById,
  deletePrimaryCategoryById,
};
