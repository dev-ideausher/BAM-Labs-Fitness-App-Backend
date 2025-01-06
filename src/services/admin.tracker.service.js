

const mongoose = require('mongoose');
const { PrimaryCategory, TargetedMuscle, Habit, StrengthExercise } = require("../models");
const { getPaginateConfig } = require("../utils/queryPHandler");

const getStrengthContent = async () => {
    const data = await PrimaryCategory.find({isDeleted:false});
    const updatedData = await Promise.all(
        data.map(async (item) => {
          const muscles = await TargetedMuscle.find({ primaryCategory: item._id }).select("targetedMuscle");
          return { ...item.toObject(), muscles }; // Use `.toObject()` to ensure the result is a plain object
        })
      );
      
    return updatedData;
}

const getAllHabits = async ({page, limit}) => {
    const {filters, options} = getPaginateConfig({page, limit});
    filters['$or'] = [{publicVisibility:true}, {publicVisibility:{$exists:false}}]

    const data = await Habit.paginate(filters, options);
    return data;
}

const createNewHabit = async ({name}) => {
    const habit = await Habit.create({name});
    return habit;
}

const updateHabit = async ({id, name}) => {
    const habit = await Habit.findByIdAndUpdate(id, {name}, {new: true});
    return habit;
}

const deleteHabit = async ({id}) => {
    const habit = await Habit.deleteOne({_id:id});
    return habit;
}


// create new strength content
const createStrengthContent = async (data) => {
    const { name, image, targetMuscle } = data;

    // Start a session
    const session = await PrimaryCategory.startSession();
    session.startTransaction();

  
        // First create the primary category
        const primaryCat = await PrimaryCategory.create([{ categoryName: name, image }], { session });

        // Prepare response structure
        let res = {
            primaryCategory: primaryCat[0],
            targetedMuscles: []
        };

        // Iterate over targeted muscles
        for (const muscle of targetMuscle) {
            const { muscleName, excercizes } = muscle;

            // Create targeted muscle
            const targetedMuscle = await TargetedMuscle.create(
                [{ targetedMuscle: muscleName, primaryCategory: primaryCat[0]._id }],
                { session }
            );

            // Create exercises for the targeted muscle
            const resEx = [];
            for (const excercize of excercizes) {
                const { video, name, metrices } = excercize;

                const strengthExercise = await StrengthExercise.create(
                    [{
                        primaryCategory: primaryCat[0]._id,
                        targetedMuscle: targetedMuscle[0]._id,
                        exerciseName: name,
                        video,
                        metrices
                    }],
                    { session }
                );

                resEx.push(strengthExercise[0]);
            }

            // Append muscle and exercises to response
            res.targetedMuscles.push({ targetedMuscle: targetedMuscle[0], excercizes: resEx });
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        return res;
    
};


const getSpecificCategory = async (id) => {
    const primaryCategory = await PrimaryCategory.findOne({ _id: id });
    const targetedMuscles = await TargetedMuscle.find({ primaryCategory: primaryCategory._id });
    let res = [];
    for (const muscle of targetedMuscles) {
        const excercizes = await StrengthExercise.find({ targetedMuscle: muscle._id });
        res.push({ muscle, excercizes });
    }
    return res;
};

const updateMuscleExcercise = async (data) => {
    const {type, id, name, video, metrices} = data;
    let res;
    if(type === "muscle"){
        const muscle = await TargetedMuscle.findOne({_id:id});
        muscle.targetedMuscle = name ? name : muscle.targetedMuscle;
        const saved = await muscle.save();
        res = saved;
    } else if(type === "excercise"){
        const excercize = await StrengthExercise.findOne({_id: new mongoose.Types.ObjectId(id)});
        excercize.exerciseName = name ? name : excercize.exerciseName;
        excercize.video = video?.key ? video : excercize.video;
        excercize.metrices =  metrices && metrices.length > 0 ? metrices : excercize.metrices;
        const saved = await excercize.save();
        res = saved;
    }
    return res;

}

const deleteMuscle = async (id) => {
    const muscle = await TargetedMuscle.findOneAndUpdate({_id:id}, {isDeleted:true}, {new: true});
    const muscleExcercises = await StrengthExercise.find({targetedMuscle:id});
    muscleExcercises.forEach(muscleExcercise => {
        muscleExcercise.isDeleted = true;
        muscleExcercise.save();
    });
    return muscle;
}

const deleteExcercise = async (id) => {
    const excercize = await StrengthExercise.findOneAndUpdate({_id:id}, {isDeleted:true}, {new: true});
    return excercize;
}


const updateVideo = async (excerciseId, video) => {
    let id = new mongoose.Types.ObjectId(excerciseId.toString());
    const strengthExercise = await StrengthExercise.findByIdAndUpdate(id, {video}, {new: true});
    return strengthExercise;
}
module.exports = {
    getStrengthContent,
    getSpecificCategory,
    getAllHabits,
    createNewHabit,
    updateHabit,
    deleteHabit,
    createStrengthContent,
    updateMuscleExcercise,
    deleteMuscle,   
    deleteExcercise,
    updateVideo
}