const Joi = require('joi');

const approveQRSession = {
  body: Joi.object().keys({
    sessionId: Joi.string().required().messages({
      'any.required': 'sessionId is required',
      'string.empty': 'sessionId cannot be empty',
    }),
  }),
};

const getQRSessionStatus = {
  query: Joi.object().keys({
    sessionId: Joi.string().required().messages({
      'any.required': 'sessionId is required',
      'string.empty': 'sessionId cannot be empty',
    }),
  }),
};

module.exports = {
  approveQRSession,
  getQRSessionStatus,
};

