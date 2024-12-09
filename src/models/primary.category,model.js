const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const primaryCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {timestamps: true}
);

primaryCategorySchema.plugin(paginate);

const PrimaryCategory = mongoose.model('PrimaryCategory', primaryCategorySchema);

module.exports = {
  PrimaryCategory,
};
