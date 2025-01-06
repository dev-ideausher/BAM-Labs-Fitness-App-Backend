const Joi = require('joi');
const {objectId} = require('./custom.validation');


const updateUser = {
  body:Joi.object().keys({
    name: Joi.string().trim().required(),
    dob: Joi.date().iso().required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    weight: Joi.number().positive().required(),
    height: Joi.number().positive().required(),
    phone: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required(),
    profilePic: Joi.object({
      key: Joi.string().required(),
      url: Joi.string().uri().required(),
    }).required(),
    bodyImage: Joi.array().items(
      Joi.object({
        pose: Joi.string().valid('front', 'back', 'left', 'right').required(),
        file: Joi.object({
          key: Joi.string().required(),
          url: Joi.string().uri().required(),
        }).required(),
      })
    ).optional(),
  })
}
const updateUserPreferences = {
  body: Joi.object().keys({
    notificationEnabled: Joi.boolean(),
    locationShared: Joi.boolean(),
  }),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  updateUser,
  deleteUser,
  updateUserPreferences,
};
