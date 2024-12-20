const Joi = require('joi');
const { objectId } = require('./custom.validation');
const userHabitLogSchema = {
    body:Joi.object().keys({
        userHabitId: Joi.string().custom(objectId).required(),
      })
}

module.exports = {
    userHabitLogSchema,
  };
