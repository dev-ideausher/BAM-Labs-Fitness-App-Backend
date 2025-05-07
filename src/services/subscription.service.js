const Subscription = require('../models/subscription.model');
const ApiError = require('../utils/ApiError');
const {User} = require('../models');
const {verifyPurchaseTest} = require('../controllers/testverify');
const {initializeGoogleAuth, getSubscriptionDetails} = require('../microservices/inappverfication');
const SubscriptionDetails = require('../models/subscriptionDetails.model');

const subscriptionTypes = ['bamttclub_monthly_plan', 'bamttclub_annual_plan'];

function getSubscriptionDates(subscriptionType) {
  if (!subscriptionTypes.includes(subscriptionType)) {
    throw new ApiError(400, `Invalid subscription type: ${subscriptionType}`);
  }

  const startDate = new Date();
  const endDate = new Date(startDate);

  switch (subscriptionType) {
    case 'bamttclub_monthly_plan':
      endDate.setMonth(endDate.getMonth() + 1);
      break;

    case 'bamttclub_annual_plan':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  return {startDate, endDate};
}

const productPriceMap = {
  bamttclub_monthly_plan: {
    price: 4.99,
    currencyCode: 'USD',
  },
  bamttclub_annual_plan: {
    price: 45,
    currencyCode: 'USD',
  },
};

const verifyAndCreateSubscription = async (userId, data) => {
  const {productId, purchaseToken, transactionId} = data;

  const existingSubscription = await Subscription.findOne({
    $or: [{purchaseToken}, {transactionId}],
  });
  if (existingSubscription) {
    throw new ApiError(400, 'This purchase token or transaction ID is already in use.');
  }

  const subscriptionDates = getSubscriptionDates(productId);

  let amount, currency;
  if (productPriceMap[productId]) {
    amount = productPriceMap[productId].price;
    currency = productPriceMap[productId].currencyCode;
  }

  const subscription = new Subscription({
    user: userId,
    productId,
    purchaseToken,
    transactionId,
    startDate: subscriptionDates.startDate,
    endDate: subscriptionDates.endDate,
    status: 'ACTIVE',
    ...(amount && currency && {amount, currency}),
  });
  const finalData = await subscription.save();

  await User.findByIdAndUpdate(
    userId,
    {
      subscription: finalData._id,
      // isTrialActivated,
      // trialStarted: isTrialActivated ? new Date() : undefined,
      // trialEnded: isTrialActivated
      //   ? new Date(subscriptionDates.endDate)
      //   : undefined,
    },
    {new: true}
  );

  return finalData;
};

const subscribeVerifyPlan = async (subscriptionBody, userId) => {
  const {productId, purchaseToken, transactionId} = subscriptionBody;

  const check = await Subscription.findOne({
    purchaseToken: purchaseToken,
  });

  if (check) {
    throw new ApiError(400, 'Already subscribed with this purchase token');
  }

  const verified = await verifyPurchaseTest(purchaseToken, productId);
  console.log(verified, 'verified');
  if (verified.success) {
    const {orderId, amount, autoRenewing, currency, startTime, expiryTime, subscriptionStatus} = verified.data;
    const userSubscription = new Subscription({
      user: userId,
      productId,
      purchaseToken,
      orderId,
      autoRenewing,
      transactionId,
      currency,
      amount,
      startDate: startTime,
      endDate: expiryTime,
      status: subscriptionStatus,
    });

    const finalData = await userSubscription.save();
    await User.findByIdAndUpdate(userId, {subscription: finalData._id}, {new: true});
    return finalData;
  } else {
    throw new ApiError(400, verified.error.message);
  }
};
const updateExpiredSubscriptions = async () => {
  const now = new Date();
  try {
    const subscriptionsToUpdate = await Subscription.find({
      endDate: {$lt: now},
      status: {$ne: 'EXPIRED'},
    });

    for (const subscription of subscriptionsToUpdate) {
      subscription.status = 'EXPIRED';
      await subscription.save();
      console.log(`Marked subscription as expired for user: ${subscription.user}`);
    }

    console.log('Expired subscriptions update completed.');
  } catch (err) {
    console.error('Error updating expired subscriptions:', err);
  }
};

const getSubscriptionDetailsTest = async subscriptionId => {
  try {
    const androidPublisher = await initializeGoogleAuth();
    const packageName = 'com.iu.bam_fitness_app';

    let existingSubscription = await SubscriptionDetails.findOne({
      productId: subscriptionId,
    });

    const result = await getSubscriptionDetails(androidPublisher, packageName, subscriptionId);

    if (result.success) {
      const subscriptionData = {
        productId: subscriptionId,
        ...result.data,
      };

      if (existingSubscription) {
        const isDataChanged =
          JSON.stringify(existingSubscription.toObject()) !==
          JSON.stringify({
            ...existingSubscription.toObject(),
            updatedAt: undefined,
            createdAt: undefined,
          });

        if (isDataChanged) {
          existingSubscription.set(subscriptionData);
          await existingSubscription.save();
          return {
            success: true,
            data: existingSubscription,
            updated: true,
          };
        } else {
          return {
            success: true,
            data: existingSubscription,
            updated: false,
          };
        }
      } else {
        const newSubscription = new SubscriptionDetails(subscriptionData);
        await newSubscription.save();
        return {
          success: true,
          data: newSubscription,
          updated: true,
        };
      }
    } else {
      console.error('Failed to fetch subscription details:', result.error);

      if (existingSubscription) {
        return {
          success: true,
          data: existingSubscription,
          updated: false,
        };
      }

      return {success: false, error: result.error};
    }
  } catch (error) {
    console.error('Error during fetching subscription details:', {
      message: error.message,
      stack: error.stack,
    });
    if (error.code === 11000) {
      const existingSubscription = await SubscriptionDetails.findOne({
        productId: subscriptionId,
      });

      if (existingSubscription) {
        return {
          success: true,
          data: existingSubscription,
          updated: false,
        };
      }
    }

    return {success: false, error: error.message};
  }
};

async function getMyUserSubscriptions(user, filters, options) {
  const page = await Subscription.paginate(
    {...filters, user: user._id},
    {
      ...options,
      populate: ['user::*'],
      lean: true,
    }
  );

  const now = new Date();
  const todayMidnightUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  page.results = page.results.map(sub => {
    const start = new Date(sub.startDate);

    const trialEnd = new Date(start);
    trialEnd.setUTCDate(trialEnd.getUTCDate() + (sub.freeTrialDays || 21));

    const trialEndMidnightUtc = Date.UTC(trialEnd.getUTCFullYear(), trialEnd.getUTCMonth(), trialEnd.getUTCDate());

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil((trialEndMidnightUtc - todayMidnightUtc) / MS_PER_DAY);

    sub.remainingFreeTrialDays = diffDays > 0 ? diffDays : 0;
    return sub;
  });

  return page;
}

module.exports = {
  subscribeVerifyPlan,
  updateExpiredSubscriptions,
  getSubscriptionDetailsTest,
  getMyUserSubscriptions,
  verifyAndCreateSubscription,
};
