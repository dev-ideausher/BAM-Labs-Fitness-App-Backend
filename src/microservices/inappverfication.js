const path = require('path');
const {google} = require('googleapis');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Subscription = require('../models/subscription.model');
const {User} = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const config = require('../config/config');

const APPLE_KEY_ID = 'D5J57TZUP9';
const APPLE_ISSUER_ID = 'bbdea024-5342-4904-9a8a-69fc8400de67';
const APPLE_BUNDLE_ID = 'com.iu.bamFitnessApp';
const APPLE_PRODUCTION_URL = 'https://api.storekit.itunes.apple.com/inApps/v1';
const APPLE_SANDBOX_URL = 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1';
const APPLE_LOOKUP_URL = 'https://api.appstoreconnect.apple.com/v1';

const initializeGoogleAuth = async () => {
  try {
    const serviceAccountToUse = config.serviceAccount;
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountToUse,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    // console.log('Google Auth initialized successfully.');
    return google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });
  } catch (error) {
    console.error('Failed to initialize Play Store client:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};
const verifyPurchase = async (androidPublisher, packageName, subscriptionId, purchaseToken) => {
  try {
    // console.log("Verifying purchase with the following details:", {
    //   packageName,
    //   subscriptionId,
    //   purchaseToken,
    // });

    const response = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId,
      token: purchaseToken,
    });

    const {
      startTimeMillis,
      expiryTimeMillis,
      autoRenewing,
      acknowledgementState,
      cancelReason,
      orderId,
      priceAmountMicros,
      priceCurrencyCode,
    } = response.data;

    const startTime = new Date(parseInt(startTimeMillis)).toISOString();
    const expiryTime = new Date(parseInt(expiryTimeMillis)).toISOString();

    const currentTimeMillis = Date.now();

    let subscriptionStatus = 'UNKNOWN';

    if (currentTimeMillis > parseInt(expiryTimeMillis)) {
      subscriptionStatus = 'EXPIRED';
    } else if (autoRenewing) {
      subscriptionStatus = 'ACTIVE';
    } else if (cancelReason === 0) {
      subscriptionStatus = 'CANCELED_BY_USER';
    } else if (cancelReason === 1) {
      subscriptionStatus = 'CANCELED_BY_SYSTEM';
    } else if (paymentState === 0) {
      subscriptionStatus = 'PAYMENT_PENDING';
    } else if (paymentState === 2) {
      subscriptionStatus = 'FREE_TRIAL';
    } else if (acknowledgementState === 0) {
      subscriptionStatus = 'NOT_ACKNOWLEDGED';
    }

    const amount = parseFloat(priceAmountMicros) / 1_000_000;

    // console.log("Parsed purchase data:", {
    //   productId: subscriptionId,
    //   startTime,
    //   expiryTime,
    //   autoRenewing,
    //   acknowledgementState,
    //   cancelReason,
    //   orderId,
    //   amount,
    //   currency: priceCurrencyCode,
    //   subscriptionStatus,
    // });

    return {
      success: true,
      data: {
        productId: subscriptionId,
        startTime,
        expiryTime,
        autoRenewing,
        acknowledgementState,
        cancelReason,
        orderId,
        amount,
        currency: priceCurrencyCode,
        subscriptionStatus,
      },
    };
  } catch (error) {
    console.error('Failed to verify purchase:', {
      message: error.message,
      stack: error.stack,
      details: {
        packageName,
        subscriptionId,
        purchaseToken,
      },
    });
    return {
      success: false,
      error: error.message,
    };
  }
};

const getSubscriptionDetails = async (androidPublisher, packageName, subscriptionId) => {
  try {
    // console.log("Fetching subscription details:", {
    //   packageName,
    //   subscriptionId,
    // });

    const response = await androidPublisher.monetization.subscriptions.get({
      packageName,
      productId: subscriptionId,
    });

    //   console.log("Subscription Data:", JSON.stringify(response.data, null, 2));

    const {listings, basePlans} = response.data || {};

    let subscriptionName = 'N/A';
    let benefits = [];
    let description = 'N/A';
    if (listings && listings.length > 0) {
      const listing = listings[0];
      subscriptionName = listing.title || 'N/A';
      benefits = listing.benefits || [];
      description = listing.description || 'N/A';
    } else {
      //   console.log("No listings available for this subscription.");
    }

    const basePlanDetails = [];
    if (basePlans && basePlans.length > 0) {
      for (const basePlan of basePlans) {
        let amount = 'N/A';
        let currencyCode = 'USD';
        if (basePlan.otherRegionsConfig && basePlan.otherRegionsConfig.usdPrice) {
          const {units, nanos, currencyCode: usdCurrencyCode} = basePlan.otherRegionsConfig.usdPrice;
          currencyCode = usdCurrencyCode || 'USD';
          const convertedAmount = calculateAmount(units, nanos);
          amount = `${convertedAmount} ${currencyCode}`;
        } else {
          //   console.log(
          //     `No USD pricing information available for base plan ${basePlan.basePlanId}.`
          //   );
        }

        basePlanDetails.push({
          id: basePlan.basePlanId,
          status: basePlan.state || 'N/A',
          autoRenewing: basePlan.autoRenewingBasePlanType ? true : false,
          amount,
        });
      }
    } else {
      //   console.log("No base plans available for this subscription.");
    }

    return {
      success: true,
      data: {
        productId: subscriptionId,
        subscriptionName,
        benefits,
        description,
        basePlans: basePlanDetails,
      },
    };
  } catch (error) {
    console.error('Failed to fetch subscription details:', {
      message: error.message,
      stack: error.stack,
      details: {packageName, subscriptionId},
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

function calculateAmount(units, nanos) {
  const unitsNumber = parseInt(units) || 0;
  const nanosNumber = parseInt(nanos) || 0;
  const nanosAsUnits = nanosNumber / 1e9;
  const totalAmount = unitsNumber + nanosAsUnits;
  return totalAmount.toFixed(2);
}

const generateJWTToken = () => {
  try {
    const privateKeyPath = path.join(__dirname, '../../AuthKey.p8');
    console.log(`Private key path: ${privateKeyPath}`);

    if (!fs.existsSync(privateKeyPath)) {
      throw new Error('AuthKey.p8 file not found at the specified path.');
    }

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    console.log(`Private key loaded successfully`);

    const payload = {
      iss: APPLE_ISSUER_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 20,
      aud: 'appstoreconnect-v1',
      bid: APPLE_BUNDLE_ID,
    };

    console.log('JWT Payload:', payload);

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: APPLE_KEY_ID,
    });
    console.log(`Token Header: ${JSON.stringify(jwt.decode(token, {complete: true}).header)}`);
    console.log(`Token Payload: ${JSON.stringify(jwt.decode(token))}`);

    console.log('Generated JWT Token:', token);
    return token;
  } catch (error) {
    console.error('Error generating JWT token:', error.message);
    throw error;
  }
};
const safeDate = dateValue => {
  if (!dateValue) return null;
  try {
    if (typeof dateValue === 'number' || !isNaN(Number(dateValue))) {
      const timestamp = Number(dateValue);
      const date = timestamp > 9999999999 ? new Date(timestamp) : new Date(timestamp * 1000);
      return date.toISOString();
    }
    return new Date(dateValue).toISOString();
  } catch (e) {
    console.warn(`Cannot parse date value: ${dateValue}`, e.message);
    return null;
  }
};
const determineTransactionStatus = transactionData => {
  const expiresDate = transactionData.expiresDate ? new Date(transactionData.expiresDate) : null;
  const currentDate = new Date();
  const isRevoked = transactionData.revocationReason !== null && transactionData.revocationReason !== undefined;

  let status = 'PURCHASED';
  if (expiresDate) {
    if (expiresDate < currentDate) {
      status = 'EXPIRED';
    } else {
      status = 'ACTIVE';
    }
  }

  if (isRevoked) {
    status = 'REVOKED';
  }

  if (transactionData.type) {
    switch (transactionData.type) {
      case 'Auto-Renewable Subscription':
        if (expiresDate && expiresDate > currentDate) {
          status = 'ACTIVE';
        } else {
          status = 'EXPIRED';
        }
        break;
      case 'Non-Renewing Subscription':
        if (expiresDate && expiresDate > currentDate) {
          status = 'ACTIVE_NON_RENEWING';
        } else {
          status = 'EXPIRED_NON_RENEWING';
        }
        break;
      case 'Consumable':
        status = 'PURCHASED_CONSUMABLE';
        break;
      case 'Non-Consumable':
        status = 'PURCHASED_NON_CONSUMABLE';
        break;
    }
  }

  return status;
};

const getProductPrice = async productId => {
  try {
    console.log(`Looking up price for product ID: ${productId}`);
    const token = generateJWTToken();
    const appsResponse = await axios.get(`${APPLE_LOOKUP_URL}/apps`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: {
        'filter[bundleId]': APPLE_BUNDLE_ID,
      },
    });

    if (!appsResponse.data.data || appsResponse.data.data.length === 0) {
      throw new Error(`No app found with bundle ID: ${APPLE_BUNDLE_ID}`);
    }

    const appId = appsResponse.data.data[0].id;
    console.log(`Found App ID: ${appId}`);
    const inAppResponse = await axios.get(`${APPLE_LOOKUP_URL}/apps/${appId}/inAppPurchasesV2`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!inAppResponse.data.data || inAppResponse.data.data.length === 0) {
      console.warn('No in-app purchases found for this app');
      return null;
    }

    console.log('Available in-app purchases:');
    inAppResponse.data.data.forEach(product => {
      console.log(`- ${product.attributes.referenceName || product.id}: ${product.attributes.productId}`);
    });

    const product = inAppResponse.data.data.find(
      p => p.attributes.productId === productId || p.attributes.referenceName === productId || p.id === productId
    );

    if (!product) {
      console.warn(`No in-app purchase found matching product ID: ${productId}`);
      return {
        amount: null,
        currency: null,
        productType: 'Subscription',
        referenceName: productId,
      };
    }

    console.log('Found matching product:', product.id, product.attributes.productId);

    const priceResponse = await axios.get(`${APPLE_LOOKUP_URL}/inAppPurchases/${product.id}/prices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!priceResponse.data.data || priceResponse.data.data.length === 0) {
      console.warn(`No price information found for product ID: ${productId}`);
      return {
        amount: null,
        currency: null,
        productType: product.attributes.inAppPurchaseType,
        referenceName: product.attributes.referenceName,
      };
    }

    const prices = priceResponse.data.data;
    let priceInfo = prices.find(p => p.attributes.territory === 'USA');
    if (!priceInfo) {
      priceInfo = prices[0];
    }

    return {
      amount: parseFloat(priceInfo.attributes.retailPrice || '0'),
      currency: priceInfo.attributes.currencyCode || 'USD',
      tier: product.attributes.priceTier,
      productType: product.attributes.inAppPurchaseType,
      referenceName: product.attributes.referenceName,
    };
  } catch (error) {
    console.error(
      'Error fetching product price:',
      error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
    );

    return {
      amount: null,
      currency: null,
      productType: 'Unknown',
      referenceName: productId,
    };
  }
};

const verifyTransactionWithApple = async (transactionId, isSandbox = false) => {
  try {
    console.log(`Verifying transaction ID: ${transactionId}`);
    const token = generateJWTToken();
    const baseUrl = isSandbox ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;
    const requestUrl = `${baseUrl}/transactions/${transactionId}`;
    console.log(`Request URL: ${requestUrl}`);

    const response = await axios.get(requestUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response Status:', response.status);
    if (!response.data) {
      throw new Error('No data returned from Apple API');
    }

    console.log('Transaction Details Response:', JSON.stringify(response.data, null, 2));
    if (!response.data.data) {
      if (response.data.signedTransactionInfo || response.data.receipt) {
        console.log('Found alternative transaction format, processing...');
        return verifyJWSTransaction(response.data.signedTransactionInfo || JSON.stringify(response.data.receipt));
      }
      throw new Error('Transaction data not found in response');
    }

    const transactionData = response.data.data;
    const attributes = transactionData.attributes || {};
    const purchaseDate = safeDate(attributes.signedDate || attributes.purchaseDate);
    const expiresDate = safeDate(attributes.expiresDate);

    const transactionInfo = {
      productId: attributes.productId || null,
      transactionId: transactionData.id || transactionId,
      purchaseDate: purchaseDate || new Date().toISOString(),
      expiresDate: expiresDate,
      orderId: attributes.originalTransactionId || transactionData.id || transactionId,
      quantity: attributes.quantity || 1,
      environment: isSandbox ? 'sandbox' : 'production',
      revocationReason: attributes.revocationReason,
      type: attributes.type,
      inAppOwnershipType: attributes.inAppOwnershipType,
    };

    transactionInfo.status = determineTransactionStatus(transactionInfo);
    if (transactionInfo.productId) {
      const priceInfo = await getProductPrice(transactionInfo.productId);
      if (priceInfo) {
        transactionInfo.amount = priceInfo.amount;
        transactionInfo.currency = priceInfo.currency;
        transactionInfo.productType = priceInfo.productType;
        transactionInfo.productName = priceInfo.referenceName;
      }
    }

    return {
      success: true,
      data: [transactionInfo],
    };
  } catch (error) {
    console.error(
      'Transaction Verification Error:',
      error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message
    );

    if (!isSandbox) {
      console.log('Retrying with sandbox environment...');
      try {
        return await verifyTransactionWithApple(transactionId, true);
      } catch (sandboxError) {
        console.error('Sandbox verification also failed:', sandboxError.message);
        console.log('===== ATTEMPTING JWS FALLBACK =====');
        try {
          return await verifyJWSTransaction(transactionId);
        } catch (jwsError) {
          console.error('JWS fallback also failed:', jwsError.message);
        }
      }
    }

    return {
      success: false,
      error: error.response ? error.response.data : error.message,
    };
  }
};

const verifyJWSTransaction = async jws => {
  try {
    console.log('Verifying JWS transaction...');
    let jwsString = jws;
    try {
      const parsed = JSON.parse(jws);
      if (typeof parsed === 'object' && parsed.jws) {
        jwsString = parsed.jws;
      } else if (typeof parsed === 'string') {
        jwsString = parsed;
      }
    } catch (e) {}

    const parts = jwsString.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWS format');
    }

    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);

    console.log('Decoded JWS Payload:', JSON.stringify(payload, null, 2));

    const purchaseDate = safeDate(payload.purchase_date || payload.purchaseDate);
    const expiresDate = safeDate(payload.expires_date || payload.expiresDate);

    let amount = null;
    let currency = null;

    if (payload.price !== undefined) {
      if (typeof payload.price === 'number') {
        amount = payload.price / 1000;
      } else {
        amount = parseFloat(payload.price);
      }
      currency = payload.currency || 'USD';
    }

    const transactionInfo = {
      productId: payload.product_id || payload.productId,
      transactionId: payload.transaction_id || payload.transactionId || payload.txn_id,
      purchaseDate: purchaseDate || new Date().toISOString(),
      expiresDate: expiresDate,
      orderId:
        payload.original_transaction_id ||
        payload.originalTransactionId ||
        payload.transaction_id ||
        payload.transactionId ||
        payload.txn_id,
      quantity: payload.quantity || 1,
      environment: payload.environment || 'production',
      type: payload.type || (expiresDate ? 'Auto-Renewable Subscription' : 'Non-Consumable'),
      amount: amount,
      currency: currency,
      storefront: payload.storefront || null,
      productName: payload.productId || null,
    };

    transactionInfo.status = determineTransactionStatus(transactionInfo);
    if (transactionInfo.productId && !transactionInfo.amount) {
      const priceInfo = await getProductPrice(transactionInfo.productId);
      if (priceInfo) {
        transactionInfo.amount = priceInfo.amount;
        transactionInfo.currency = priceInfo.currency;
        transactionInfo.productType = priceInfo.productType;
        transactionInfo.productName = priceInfo.referenceName;
      }
    }

    return {
      success: true,
      data: [transactionInfo],
    };
  } catch (error) {
    console.error('JWS Transaction Verification Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

const isAppleSubscription = subscription => {
  if (!subscription) return false;
  const isNumericId = /^\d+$/.test(subscription.transactionId);
  const tokenMatchesId = subscription.transactionId === subscription.purchaseToken;

  const isGoogleTransactionId = subscription.transactionId?.startsWith('GPA.');

  const isGooglePurchaseToken = subscription.purchaseToken?.length > 50 && subscription.purchaseToken?.includes('.');

  if (isGoogleTransactionId || isGooglePurchaseToken) {
    return false;
  }

  if (isNumericId && tokenMatchesId) {
    return true;
  }

  return isNumericId && subscription.transactionId.length < 20;
};

// const getCurrentSubscriptionStatus = catchAsync(async (req, res) => {
//   const userId = req.user._id;

//   try {
//     const latestSubscription = await Subscription.findOne({user: userId}, {}, {sort: {createdAt: -1}});
//     console.log(latestSubscription, 'latestSubscription');
//     if (!latestSubscription) {
//       return res.status(404).json({
//         status: false,
//         message: 'No subscription found for this user',
//       });
//     }

//     const userObject = await User.findById(userId);

//     if (!userObject) {
//       throw new ApiError(404, 'User not found');
//     }

//     const isApplePurchase = isAppleSubscription(latestSubscription);

//     let liveStatus;

//     if (isApplePurchase) {
//       const result = await verifyTransactionWithApple(latestSubscription.transactionId);

//       if (!result.success) {
//         throw new ApiError(500, `Failed to verify with Apple: ${result.error}`);
//       }

//       const transaction = result.data[0];
//       liveStatus = {
//         platform: 'ios',
//         productId: transaction.productId || latestSubscription.productId,
//         transactionId: transaction.transactionId,
//         orderId: transaction.orderId,
//         status: mapAppleStatusToOurStatus(transaction.status),
//         startDate: new Date(transaction.purchaseDate),
//         endDate: transaction.expiresDate ? new Date(transaction.expiresDate) : null,
//         isActive: ['ACTIVE', 'PURCHASED', 'PURCHASED_NON_CONSUMABLE'].includes(transaction.status),
//         amount: transaction.amount || latestSubscription.amount,
//         currency: transaction.currency || latestSubscription.currency,
//       };
//     } else {
//       const androidPublisher = await initializeGoogleAuth();

//       const result = await verifyPurchase(
//         androidPublisher,
//         'com.iu.bam_fitness_app',
//         latestSubscription.productId,
//         latestSubscription.purchaseToken
//       );

//       if (!result.success) {
//         throw new ApiError(500, `Failed to verify with Google Play: ${result.error}`);
//       }

//       const subscription = result.data;
//       liveStatus = {
//         platform: 'android',
//         productId: subscription.productId,
//         purchaseToken: latestSubscription.purchaseToken,
//         orderId: subscription.orderId,
//         status: mapGoogleStatusToOurStatus(subscription.subscriptionStatus),
//         startDate: new Date(subscription.startTime),
//         endDate: new Date(subscription.expiryTime),
//         isActive: subscription.subscriptionStatus === 'ACTIVE',
//         autoRenewing: subscription.autoRenewing,
//         amount: subscription.amount || latestSubscription.amount,
//         currency: subscription.currency || latestSubscription.currency,
//       };
//     }

//     const now = new Date();
//     const todayMidnightUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

//     const start = new Date(latestSubscription.startDate);

//     const trialEnd = new Date(start);
//     // trialEnd.setUTCDate(trialEnd.getUTCDate() + (latestSubscription.freeTrialDays || 21));
//     trialEnd.setUTCDate(trialEnd.getUTCDate() + (latestSubscription.freeTrialDays || 30));

//     const trialEndMidnightUtc = Date.UTC(trialEnd.getUTCFullYear(), trialEnd.getUTCMonth(), trialEnd.getUTCDate());

//     const MS_PER_DAY = 1000 * 60 * 60 * 24;
//     const diffDays = Math.ceil((trialEndMidnightUtc - todayMidnightUtc) / MS_PER_DAY);

//     liveStatus.remainingFreeTrialDays = diffDays > 0 ? diffDays : 0;

//     const mappedStatus = liveStatus.status;

//     const isDatabaseOutdated = latestSubscription.status !== mappedStatus;
//     if (isDatabaseOutdated) {
//       latestSubscription.status = mappedStatus;
//       latestSubscription.endDate = liveStatus.endDate || latestSubscription.endDate;
//       if (liveStatus.autoRenewing !== undefined) {
//         latestSubscription.autoRenewing = liveStatus.autoRenewing;
//       }
//       await latestSubscription.save();

//       liveStatus.databaseUpdated = true;
//     }

//     liveStatus._id = latestSubscription._id;
//     liveStatus.dbStatus = latestSubscription.status;

//     liveStatus.user = userObject;

//     return res.status(200).json({
//       status: true,
//       message: 'Current subscription status retrieved successfully',
//       databaseUpdated: isDatabaseOutdated,
//       data: liveStatus,
//     });
//   } catch (error) {
//     console.error('Error in getCurrentSubscriptionStatus:', error);
//     throw new ApiError(error.statusCode || 500, error.message || 'Failed to get current subscription status');
//   }
// });

const getCurrentSubscriptionStatus = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const latestSubscription = await Subscription.findOne({user: userId}, null, {sort: {createdAt: -1}});
  if (!latestSubscription) {
    return res.status(404).json({status: false, message: 'No subscription found for this user'});
  }

  const userObject = await User.findById(userId);
  if (!userObject) throw new ApiError(404, 'User not found');

  const isApple = isAppleSubscription(latestSubscription);
  let liveStatus;
  let isDatabaseUpdated = false;

  if (isApple) {
    let tx;
    try {
      const signed = await fetchAppleRenewalHistory(latestSubscription.transactionId);
      if (!signed.length) throw new Error('Empty renewal array');
      const txs = signed.map(decodeJWS).sort((a, b) => b.expiresDate - a.expiresDate);
      tx = txs[0];
    } catch (e) {
      console.warn('Apple history lookup failed, using stored data:', e.message);
      tx = {
        purchaseDate: latestSubscription.startDate.getTime(),
        expiresDate: latestSubscription.endDate.getTime(),
        status: latestSubscription.status,
        price: latestSubscription.amount * 1000,
        currency: latestSubscription.currency,
        productId: latestSubscription.productId,
        transactionId: latestSubscription.transactionId,
        originalTransactionId: latestSubscription.orderId,
        webOrderLineItemId: latestSubscription.orderId,
      };
    }

    const expiresMs = tx.expiresDate;
    const mappedStatus = mapAppleStatusToOurStatus(tx.status, expiresMs);
    const rawPrice = parseFloat(tx.price);
    const convertedAmount = !isNaN(rawPrice) ? Number((rawPrice / 1000).toFixed(2)) : latestSubscription.amount;

    liveStatus = {
      platform: 'ios',
      productId: tx.productId,
      transactionId: tx.transactionId,
      orderId: tx.webOrderLineItemId || tx.originalTransactionId,
      status: mappedStatus,
      startDate: latestSubscription.startDate,
      endDate: new Date(expiresMs),
      isActive: expiresMs > Date.now(),
      amount: convertedAmount,
      currency: tx.currency || latestSubscription.currency,
      autoRenewing: true,
    };

    const changed =
      latestSubscription.transactionId !== tx.transactionId ||
      latestSubscription.status !== mappedStatus ||
      latestSubscription.endDate.getTime() !== expiresMs ||
      latestSubscription.amount !== convertedAmount;
    if (changed) {
      latestSubscription.transactionId = tx.transactionId;
      latestSubscription.status = mappedStatus;
      latestSubscription.endDate = new Date(expiresMs);
      latestSubscription.amount = convertedAmount;
      latestSubscription.currency = liveStatus.currency;
      latestSubscription.autoRenewing = true;
      await latestSubscription.save();
      isDatabaseUpdated = true;
    }
  } else {
    const androidPublisher = await initializeGoogleAuth();
    const result = await verifyPurchase(
      androidPublisher,
      'com.iu.bam_fitness_app',
      latestSubscription.productId,
      latestSubscription.purchaseToken
    );

    if (!result.success) {
      throw new ApiError(500, `Google Play verification failed: ${result.error}`);
    }

    const sub = result.data;
    const expiresMs = new Date(sub.expiryTime).getTime();
    const mappedStatus = mapGoogleStatusToOurStatus(sub.subscriptionStatus, expiresMs);

    liveStatus = {
      platform: 'android',
      productId: sub.productId,
      purchaseToken: latestSubscription.purchaseToken,
      orderId: sub.orderId,
      status: mappedStatus,
      startDate: latestSubscription.startDate,
      endDate: new Date(expiresMs),
      isActive: expiresMs > Date.now(),
      autoRenewing: sub.autoRenewing,
      amount: sub.amount != null ? sub.amount : latestSubscription.amount,
      currency: sub.currency || latestSubscription.currency,
    };

    const changed =
      latestSubscription.endDate.getTime() !== expiresMs ||
      latestSubscription.status !== mappedStatus ||
      latestSubscription.amount !== liveStatus.amount;
    if (changed) {
      latestSubscription.endDate = new Date(expiresMs);
      latestSubscription.status = mappedStatus;
      latestSubscription.autoRenewing = liveStatus.autoRenewing;
      latestSubscription.amount = liveStatus.amount;
      latestSubscription.currency = liveStatus.currency;
      await latestSubscription.save();
      isDatabaseUpdated = true;
    }
  }

  const now = new Date();
  const trialEnd = new Date(latestSubscription.startDate);
  trialEnd.setUTCDate(trialEnd.getUTCDate() + (latestSubscription.freeTrialDays || 30));

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.ceil((trialEnd.getTime() - now.getTime()) / msPerDay);
  liveStatus.remainingFreeTrialDays = Math.max(0, diffDays);

  liveStatus._id = latestSubscription._id;
  liveStatus.dbStatus = latestSubscription.status;
  liveStatus.user = userObject;

  return res.status(200).json({
    status: true,
    message: 'Current subscription status retrieved successfully',
    databaseUpdated: isDatabaseUpdated,
    data: liveStatus,
  });
});

const mapAppleStatusToOurStatus = (appleStatus, expiresDateMs) => {
  const now = Date.now();
  if (typeof expiresDateMs === 'number' && expiresDateMs > now) {
    return 'ACTIVE';
  }
  switch (appleStatus) {
    case 'FREE_TRIAL':
      return 'FREE_TRIAL';
    case 'ACTIVE':
    case 'PURCHASED':
    case 'PURCHASED_NON_CONSUMABLE':
      return 'ACTIVE';
    case 'EXPIRED':
    case 'EXPIRED_NON_RENEWING':
      return 'EXPIRED';
    case 'CANCELED_BY_USER':
    case 'CANCELED_BY_SYSTEM':
    case 'REVOKED':
      return 'CANCELLED';
    default:
      return 'EXPIRED';
  }
};

const mapGoogleStatusToOurStatus = (googleStatus, expiresDateMs) => {
  const now = Date.now();
  if (typeof expiresDateMs === 'number' && expiresDateMs > now) {
    return 'ACTIVE';
  }
  switch (googleStatus) {
    case 'FREE_TRIAL':
      return 'FREE_TRIAL';
    case 'ACTIVE':
      return 'ACTIVE';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'CANCELED_BY_USER':
    case 'CANCELED_BY_SYSTEM':
      return 'CANCELLED';
    default:
      return 'EXPIRED';
  }
};

async function fetchAppleRenewalHistory(originalTransactionId, isSandbox = false) {
  const base = isSandbox
    ? 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1'
    : 'https://api.storekit.itunes.apple.com/inApps/v1';
  const url = `${base}/history/${originalTransactionId}`;
  const token = generateJWTToken();

  const resp = await axios.get(url, {headers: {Authorization: `Bearer ${token}`}});
  return resp.data.signedTransactions || [];
}

function decodeJWS(jws) {
  const [, payloadB64] = jws.split('.');
  const json = Buffer.from(payloadB64, 'base64').toString('utf8');
  return JSON.parse(json);
}

const getLatestRenewal = async (req, res, next) => {
  try {
    const {originalTransactionId} = req.params;
    const isSandbox = req.query.sandbox === 'true';
    const base = isSandbox
      ? 'https://api.storekit-sandbox.itunes.apple.com/inApps/v1'
      : 'https://api.storekit.itunes.apple.com/inApps/v1';
    const url = `${base}/history/${originalTransactionId}`;
    const token = generateJWTToken();

    const resp = await axios.get(url, {
      headers: {Authorization: `Bearer ${token}`},
    });

    const signed = resp.data.signedTransactions || [];
    if (!signed.length) {
      return res.status(404).json({
        status: false,
        message: 'No renewal history found—check originalTransactionId & environment',
      });
    }

    const transactions = signed.map(jws => {
      const [, payloadB64] = jws.split('.');
      const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
      return JSON.parse(payloadJson);
    });

    transactions.sort((a, b) => b.expiresDate - a.expiresDate);
    const latest = transactions[0];

    return res.json({
      status: true,
      data: {
        transactionId: latest.transactionId,
        purchaseDate: new Date(latest.purchaseDate),
        expiresDate: new Date(latest.expiresDate),
        productId: latest.productId,
        price: latest.price,
        currency: latest.currency
      },
    });
  } catch (err) {
    console.error('Error fetching renewal history:', err.response?.data || err.message);
    next(err);
  }
};

module.exports = {
  initializeGoogleAuth,
  verifyPurchase,
  getSubscriptionDetails,
  verifyTransactionWithApple,
  verifyJWSTransaction,
  getProductPrice,
  getCurrentSubscriptionStatus,
  getLatestRenewal,
};
