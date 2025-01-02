const Joi = require('joi');

const supportRequestValidationSchema = {
    body:Joi.object().keys({
        name: Joi.string().trim().required().messages({
          'string.base': 'Name must be a string.',
          'string.empty': 'Name cannot be empty.',
          'any.required': 'Name is required.',
        }),
        email: Joi.string().email().trim().required().messages({
          'string.email': 'Email must be a valid email address.',
          'string.empty': 'Email cannot be empty.',
          'any.required': 'Email is required.',
        }),
        query: Joi.string().trim().required().messages({
          'string.base': 'Query must be a string.',
          'string.empty': 'Query cannot be empty.',
          'any.required': 'Query is required.',
        }),
      
      })
      
}

const getContentTypeValidationSchema = {
    query:Joi.object().keys({
        type: Joi.string().valid("privacy policy", "terms & conditions", "introduction", "about us").required().messages({
          'string.base': 'Type must be a string.',
          'string.empty': 'Type cannot be empty.',
          'any.required': 'Type is required.',
        }),
      })
      
}
module.exports = { supportRequestValidationSchema, getContentTypeValidationSchema };
