const Joi = require('joi');

// Admin Registration Validation
const registerAdminValidation = {
    body:Joi.object().keys({
        name: Joi.string().max(255).optional(),
        email: Joi.string().email().required().messages({
          'string.email': 'Please provide a valid email address.',
          'any.required': 'Email is required.',
        }),
        phone: Joi.string().optional(),
        password: Joi.string().min(6).required().messages({
          'string.min': 'Password must be at least 6 characters long.',
          'any.required': 'Password is required.',
        }),
      })
      
}
// Admin Login Validation
const loginAdminValidation = {
    body:Joi.object().keys({
        email: Joi.string().email().required().messages({
          'string.email': 'Please provide a valid email address.',
          'any.required': 'Email is required.',
        }),
        password: Joi.string().required().messages({
          'any.required': 'Password is required.',
        }),
      })
}

module.exports = {
  registerAdminValidation,
  loginAdminValidation,
};
