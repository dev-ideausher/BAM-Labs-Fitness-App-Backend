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
      // default: null,
    },
    bodyFat: {
      type: Number,
      // default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      trim: true,
      // required: true,
      unique: true,
      sparse: true,
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

// userSchema.index({ email: 1, isDeleted: 1 });
// userSchema.index({ phone: 1, isDeleted: 1 });

// userSchema.pre('save', async function (next) {
//   try {
//     if (this.isModified('email') || this.isModified('phone')) {
//       const existingUser = await this.constructor.findOne({
//         $or: [
//           { email: this.email, isDeleted: false },
//           { phone: this.phone, isDeleted: false }
//         ],
//         _id: { $ne: this._id }
//       });

//       if (existingUser) {
//         const error = new Error('Email or phone already in use');
//         error.statusCode = 409;
//         return next(error);
//       }
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

userSchema.pre('save', async function (next) {
  try {
    if (this._bypassDupCheck) {
      return next();
    }

    const checkEmail = this.isModified('email') && !!this.email;
    const checkPhone = this.isModified('phone') && !!this.phone;

    if (checkEmail || checkPhone) {
      const queryConditions = [];
      if (this.email) {
        queryConditions.push({ email: this.email, isDeleted: false });
      }
      if (this.phone) {
        queryConditions.push({ phone: this.phone, isDeleted: false });
      }

      const existingUser = await this.constructor.findOne({
        $or: queryConditions,
        _id: { $ne: this._id },
      });

      if (existingUser) {
        const error = new Error('Email or phone already in use');
        error.statusCode = 409;
        return next(error);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

userSchema.plugin(paginate);

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
};
