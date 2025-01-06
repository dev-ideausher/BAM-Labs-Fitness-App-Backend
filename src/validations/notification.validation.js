const Joi = require('joi');
const { objectId } = require('./custom.validation');

const notificationJoiSchema = Joi.object({
  userId: Joi.string().custom(objectId).when('userType', {
    is: 'individual',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  userType: Joi.string().valid('all', 'monthly', 'annual', 'individual').optional(),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  type: Joi.string().valid('Email', 'SMS', 'PUSH').required(),
  schedule: Joi.date().required()
});

module.exports = { notificationJoiSchema };
