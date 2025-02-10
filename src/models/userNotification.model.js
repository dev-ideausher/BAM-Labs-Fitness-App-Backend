const mongoose = require('mongoose');
const { paginate } = require('./plugins/paginate');

const usernotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'sent', 'failed'],
    default: 'sent',
  },
  read: { type: Boolean, default: false }, 
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {type: Date, default: Date.now},
});

usernotificationSchema.plugin(paginate);
const userNotification = mongoose.model('userNotification', usernotificationSchema);

module.exports = {userNotification};
