const Joi = require('joi');

const baseRegisterSchema = {
  firstName: Joi.string()
    .trim()
    .required(),
  lastName: Joi.string()
    .trim()
    .required(),
  gender: Joi.string()
    .trim()
    .required(),
  phone: Joi.string().trim(),
  dob: Joi.string().isoDate(),
};

const register = {
  body: Joi.object().keys({
    ...baseRegisterSchema,
  }),
};

const registeruserValidation = {
    body:Joi.object().keys({
        name: Joi.string().max(255).required(),
        email: Joi.string().email().required().messages({
          'string.email': 'Please provide a valid email address.',
          'any.required': 'Email is required.',
        }),
        gender: Joi.string()
        .valid('male', 'female', 'other')
        .required()
        .messages({
          'any.only': 'Gender must be male, female, or other',
          'any.required': 'Gender is required',
        }),
        dob: Joi.date()
        .iso()
        .required()
        .messages({
          'date.base': 'Date of Birth must be a valid date',
          'date.format': 'Date of Birth must be in ISO format (YYYY-MM-DD)',
          'any.required': 'Date of Birth is required',
        }),
        phone: Joi.string().required(),
        password: Joi.string().min(6).required().messages({
          'string.min': 'Password must be at least 6 characters long.',
          'any.required': 'Password is required.',
        }),
      })
      
}
module.exports = {
  register,
  registeruserValidation,
};
