const mongoose = require("mongoose");
const { paginate } = require("./plugins/paginate");

const UserSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: String,
      required: true,
      enum: ["bamttclub_monthly_plan","bamttclub_annual_plan"],
    },
    purchaseToken: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: String,
    },
    amount: {
      type: Number,
    },
    autoRenewing: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED", "FREE_TRIAL", "EXPIRED"],
      required: true,
    },
  },
  { timestamps: true }
);

UserSubscriptionSchema.plugin(paginate);

const UserSubscription = mongoose.model(
  "UserSubscription",
  UserSubscriptionSchema
);

module.exports = UserSubscription;