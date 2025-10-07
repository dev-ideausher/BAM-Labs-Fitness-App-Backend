const Category = require('../models/category.model');

const createCategory = async ({ name }) => {
  return Category.create({ name });
};

const getAllCategories = async (filters, options) => {
  const data = await Category.paginate(filters, options);
  return data;
};

module.exports = { createCategory, getAllCategories };
