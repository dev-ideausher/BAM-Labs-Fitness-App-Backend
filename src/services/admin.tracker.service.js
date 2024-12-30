

const { PrimaryCategory, TargetedMuscle, Habit, StrengthExercise } = require("../models");
const { getPaginateConfig } = require("../utils/queryPHandler");

const getStrengthContent = async () => {
    const data = await PrimaryCategory.find();
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


module.exports = {
    getStrengthContent,
    getSpecificCategory,
    getAllHabits,
    createNewHabit,
    updateHabit,
    deleteHabit,
    createStrengthContent
}