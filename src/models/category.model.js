const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const categorySchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true},
    isActive: {type: Boolean, default: true},
  },
  {timestamps: true}
);
categorySchema.index({name: 1}, {unique: true, collation: {locale: 'en', strength: 2}});

categorySchema.plugin(paginate);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
