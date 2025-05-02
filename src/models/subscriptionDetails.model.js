const mongoose = require("mongoose");

const subscriptionDetailsSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    subscriptionName: { type: String },
    benefits: [{ type: String }],
    description: { type: String },
    basePlans: [
      {
        id: { type: String },
        status: { type: String },
        autoRenewing: { type: Boolean },
        amount: { type: String }
      },
    ],
  },
  { timestamps: true }
);

const SubscriptionDetails = mongoose.model("SubscriptionDetails", subscriptionDetailsSchema);

module.exports = SubscriptionDetails;
