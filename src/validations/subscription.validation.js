const Joi = require('joi');

const subscribeVerify = Joi.object().keys({
  productId: Joi.string().required(),
  purchaseToken: Joi.string().required(),
  transactionId: Joi.string().required(),
});

const subscribeApplyeVerify = Joi.object().keys({
  TRANSACTION_ID: Joi.string().required(),
});

module.exports = {subscribeVerify, subscribeApplyeVerify};
