const Joi = require('joi');

const createStrengthContentValidation = {
    body: Joi.object({
        name: Joi.string().required(),
        image: Joi.object({
            key: Joi.string().required(),
            url: Joi.string().required()
        }).required(),
        targetMuscle: Joi.array().items(
            Joi.object({
                muscleName: Joi.string().required(),
                excercizes: Joi.array().items(
                    Joi.object({
                        video: Joi.object({
                            key: Joi.string().required(),
                            url: Joi.string().required()
                        }).required(),
                        name: Joi.string().required(),
                        metrices: Joi.array()
                            .items(Joi.string().valid(
                                "date", "sessionTime", "reps", "sets", "weight", "totalReps"
                            ))
                            .required()
                    })
                ).required()
            })
        ).required()
    })
};

module.exports = {createStrengthContentValidation};
