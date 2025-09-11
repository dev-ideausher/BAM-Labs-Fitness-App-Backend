const catchAsync = require('../utils/catchAsync');
const { getPaginateConfig } = require('../utils/queryPHandler');
const categoryService = require('../services/category.service');

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory({ name: req.body.name });
  res.status(201).json({
    status: true,
    message: 'Category created successfully',
    data: category,
  });
});

const getAllCategories = catchAsync(async (req, res) => {
  const { filters, options } = getPaginateConfig(req.query);

  if (req.query.search) {
    filters.name = { $regex: req.query.search, $options: 'i' };
  }

  const data = await categoryService.getAllCategories(filters, options);
  res.status(200).json({
    status: true,
    message: 'Categories fetched successfully',
    data,
  });
});

module.exports = { createCategory, getAllCategories };
