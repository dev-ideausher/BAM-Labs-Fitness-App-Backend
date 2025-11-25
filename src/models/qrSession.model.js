const mongoose = require('mongoose');

const qrSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'expired', 'consumed'],
      default: 'pending',
      required: true,
    },
    userId: {
      type: String,
      default: null,
    },
    customToken: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    deviceType: {
      type: String,
      enum: ['tablet', 'mobile'],
      default: 'tablet',
    },
  },
  { timestamps: true }
);

qrSessionSchema.index({ sessionId: 1, status: 1 });
qrSessionSchema.index({ expiresAt: 1 });

qrSessionSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

qrSessionSchema.methods.canBeUsed = function () {
  return this.status === 'pending' && !this.isExpired();
};

const QRSession = mongoose.model('QRSession', qrSessionSchema);

module.exports = {
  QRSession,
};

