const {subscriptionService} = require('../services');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {subscribeVerifyPlan} = require('../services/subscription.service');
const {getPaginateConfig} = require('../utils/queryPHandler');
const {verifyTransactionWithApple} = require('../microservices/inappverfication');
const Subscription = require('../models/subscription.model');

const verifyCustomSubscription = catchAsync(async (req, res) => {
  try {
    const userId = req.user._id;
    const subscription = await subscribeVerifyPlan(req.body, userId);
    res.status(200).json({
      data: subscription,
      status: true,
      message: 'Subscription added successfully',
    });
  } catch (error) {
    console.error('Error in verifyCustomSubscription:', error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'Internal Server Error',
      status: false,
    });
  }
});

const getVerificationDetails = async (req, res, next) => {
  const {subscriptionId} = req.query;

  try {
    const result = await subscriptionService.getSubscriptionDetailsTest(subscriptionId);

    if (result.success) {
      return res.status(200).json({
        status: true,
        data: result.data,
        updated: result.updated,
        message: result.updated
          ? 'Subscription details fetched and saved successfully.'
          : 'Existing subscription details retrieved.',
      });
    } else {
      throw new ApiError(400, result.error);
    }
  } catch (error) {
    next(error);
  }
};
const getMyUserSubscriptions = catchAsync(async (req, res) => {
  const {filters, options} = getPaginateConfig(req.query);
  const data = await subscriptionService.getMyUserSubscriptions(req.user, filters, options);

  res.json({
    status: true,
    data,
    message: 'User subscriptions retrieved successfully',
  });
});

const ALLOWED_PRODUCT_IDS = ['bamttclub_monthly_plan', 'bamttclub_annual_plan'];

const verifyAppleTransaction = async (req, res) => {
  const {TRANSACTION_ID} = req.body;

  if (!TRANSACTION_ID) {
    return res.status(400).json({success: false, message: 'TRANSACTION_ID is required'});
  }

  try {
    const result = await verifyTransactionWithApple(TRANSACTION_ID);

    if (!result.success) {
      console.error('Verification failed:', result.error);
      return res.status(400).json({success: false, message: result.error});
    }

    const purchase = result.data[0];
    console.log('Verification successful!');

    const PRODUCT_ID = purchase.productId;
    if (!ALLOWED_PRODUCT_IDS.includes(PRODUCT_ID)) {
      return res.status(400).json({
        success: false,
        message: `Invalid productId: ${PRODUCT_ID}`,
      });
    }

    const newSubscription = new Subscription({
      user: req.user._id,
      productId: PRODUCT_ID,
      purchaseToken: purchase.transactionId,
      orderId: purchase.orderId,
      amount: purchase.amount,
      currency: purchase.currency,
      transactionId: purchase.transactionId,
      startDate: new Date(purchase.purchaseDate),
      endDate: new Date(purchase.expiresDate),
      status: purchase.status,
      autoRenewing: purchase.autoRenewing || false,
    });

    await newSubscription.save();

    return res.status(200).json({
      success: true,
      message: 'Transaction verified successfully',
      data: purchase,
    });
  } catch (error) {
    console.error('Error during transaction verification:', error.message);
    return res.status(500).json({success: false, message: error.message});
  }
};

const verifySubscriptionController = async (req, res) => {
  try {
    const userId = req.user._id;
    const {productId, purchaseToken, transactionId} = req.body;

    if (!productId || !purchaseToken || !transactionId) {
      throw new ApiError(400, 'Missing required fields: productId, purchaseToken, or transactionId.');
    }

    let subscription = await subscriptionService.verifyAndCreateSubscription(userId, {
      productId,
      purchaseToken,
      transactionId,
    });

    subscription = await Subscription.findById(subscription._id).populate('user');

    return res.status(201).json({
      status: true,
      message: 'Subscription successfully verified and created.',
      data: subscription,
    });
  } catch (error) {
    console.error('Error in verifySubscriptionController:', error);
    return res.status(error.statusCode || 500).json({
      status: false,
      message: error.message || 'Internal Server Error',
    });
  }
};

module.exports = {
  verifyCustomSubscription,
  getVerificationDetails,
  getMyUserSubscriptions,
  verifyAppleTransaction,
  verifySubscriptionController,
};
