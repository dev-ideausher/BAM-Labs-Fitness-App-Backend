const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["privacy policy", "terms & conditions", "about us"],
      required: true,

    },
    content:{
        type:String,
        required:true
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {timestamps: true}
);

contentSchema.plugin(paginate);

const Content = mongoose.model('Content', contentSchema);

module.exports = {
  Content,
};
