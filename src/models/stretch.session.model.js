const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const stretchSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    sessionTime: {
      type: Number,
      required: true,
    },
  },
  {timestamps: true}
);

stretchSessionSchema.plugin(paginate);

const StretchSession = mongoose.model('StretchSession', stretchSessionSchema);

module.exports = {StretchSession};
