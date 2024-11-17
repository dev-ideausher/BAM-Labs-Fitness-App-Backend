const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const cardioSessionSchema = new mongoose.Schema({
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
});

cardioSessionSchema.plugin(paginate);

const CardioSession = mongoose.model('CardioSession', cardioSessionSchema);

module.exports = {CardioSession};
