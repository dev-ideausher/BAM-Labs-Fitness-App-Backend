  const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'master'],
      default: 'user',
      required: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: null,
    },
    weight: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      required: true,
    },
    profilePic: {
      type: {
        key: String,
        url: String,
      },
      default: null,
    },
    bodyImage:{
      type:[{pose:{type:String, enum:["front", "back", "left", "right"], required:true}, file:{key:{type:String, required:true}, url:{type:String, required:true}}}],
      required:false
    },
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    firebaseSignInProvider: {
      type: String,
      required: true,
    },
    appNotificationsLastSeenAt: {
      type: Date,
      default: Date.now,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      // to soft delete user. if(isDeleted = true), then user is deleted.
      type: Boolean,
      default: false,
    },
  },
  {timestamps: true}
);

userSchema.plugin(paginate);

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
};
