const {primaryCategoryService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const createPrimaryCategory = catchAsync(async (req, res) => {
  const primaryCategory = await primaryCategoryService.createPrimaryCategory(req.body);
  res.status(200).json({
    status: true,
    message: 'Primary Category created successfully',
    primaryCategory,
  });
});

const getAllPrimaryCategories = catchAsync(async (req, res) => {
  const primaryCategories = await primaryCategoryService.getAllPrimaryCategories();
  res.status(200).json({
    status: true,
    message: 'Primary Categories fetched successfully',
    primaryCategories,
  });
});

const getPrimaryCategoryById = catchAsync(async (req, res) => {
  const primaryCategory = await primaryCategoryService.getPrimaryCategoryById(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Primary Category fetched successfully',
    primaryCategory,
  });
});

const updatePrimaryCategoryById = catchAsync(async (req, res) => {
  const primaryCategory = await primaryCategoryService.updatePrimaryCategoryById(req.params.id, req.body);
  res.status(200).json({
    status: true,
    message: 'Primary Category updated successfully',
    primaryCategory,
  });
});

const deletePrimaryCategoryById = catchAsync(async (req, res) => {
  await primaryCategoryService.deletePrimaryCategoryById(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Primary Category deleted successfully',
  });
});

module.exports = {
  createPrimaryCategory,
  getAllPrimaryCategories,
  getPrimaryCategoryById,
  updatePrimaryCategoryById,
  deletePrimaryCategoryById,
};
