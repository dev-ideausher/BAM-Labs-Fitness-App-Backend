const mongoose = require('mongoose');
const { paginate } = require('./plugins/paginate');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.userType === 'individual'; }

  },
  user:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true,
  },
  userType:{
    type: String,
    enum:["all", "monthly", "annual", "individual"],
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isByAdmin:{
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['Email', 'SMS', "PUSH"], // Add more types if necessary
    required: true
  },
  schedule: {
    type: Date,
    required: true
  }
}, {timestamps: true});

notificationSchema.plugin(paginate);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
