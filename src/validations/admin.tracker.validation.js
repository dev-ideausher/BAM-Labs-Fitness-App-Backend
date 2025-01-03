const Joi = require('joi');
const { objectId } = require('./custom.validation');

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

const updateMuscleExcerciseValidation = {
    body: Joi.object({
        type:Joi.string().valid("muscle", "excercise").required(),
        id: Joi.string()
        .custom(objectId)
        .required(),
        name: Joi.string().when('type', {
            is: 'muscle',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),
        video: Joi.object({
            key: Joi.string().required(),

            url: Joi.string().required()
        }),
        metrices: Joi.array().items(Joi.string().valid("date", "sessionTime", "reps", "sets", "weight", "totalReps"))
    })
}

const updateVideoValidation = {
    body: Joi.object({
        video: Joi.object({
            key: Joi.string().required(),
            url: Joi.string().required()
        }).required()
    })
}

module.exports = {createStrengthContentValidation, updateMuscleExcerciseValidation, updateVideoValidation};
