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
    bmi: {
      type: Number,
      default: null,
    },
    bodyFat: {
      type: Number,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    profilePic: {
      type: {
        key: String,
        url: String,
      },
      default: null,
    },
    bodyImage: {
      type: [
        {
          pose: {type: String, enum: ['front', 'back', 'left', 'right'], required: true},
          file: {key: {type: String, required: true}, url: {type: String, required: true}},
        },
      ],
      required: false,
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

userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ phone: 1, isDeleted: 1 });

userSchema.pre('save', async function(next) {
  if (this.isModified('email') || this.isModified('phone')) {
    const existingUser = await this.constructor.findOne({
      $or: [
        { email: this.email, isDeleted: false },
        { phone: this.phone, isDeleted: false }
      ],
      _id: { $ne: this._id }
    });

    if (existingUser) {
      next(new Error('Email or phone number already in use'));
    }
  }
  next();
});

userSchema.pre('save', function(next) {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = this.weight / heightInMeters ** 2;
  } else {
    this.bmi = null;
  }
  if (this.dob) {
    const currentDate = new Date();
    const birthDate = new Date(this.dob);
    this.age = currentDate.getFullYear() - birthDate.getFullYear();
    const monthDifference = currentDate.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && currentDate.getDate() < birthDate.getDate())) {
      this.age--;
    }
  } else {
    this.age = null;
  }

  if (this.gender && this.bmi && this.age) {
    if (this.gender === 'male') {
      this.bodyFat = 1.2 * this.bmi + 0.23 * this.age - 16.2;
    } else if (this.gender === 'female') {
      this.bodyFat = 1.2 * this.bmi + 0.23 * this.age - 5.4;
    } else if (this.gender === 'other') {
      this.bodyFat = 1.2 * this.bmi + 0.23 * this.age - 10.8;
    } else {
      this.bodyFat = null;
    }
  } else {
    this.bodyFat = null;
  }

  next();
});

userSchema.plugin(paginate);

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
};
