

const { PrimaryCategory, TargetedMuscle, Habit } = require("../models");
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

module.exports = {
    getStrengthContent,
    getAllHabits,
    createNewHabit,
    updateHabit,
    deleteHabit
}