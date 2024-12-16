const {UserHabit} = require('../models');
const {getAllData} = require('../utils/getAllData');

const createUserHabit = async habit => {
  return await UserHabit.create(habit);
};

const getUserHabit = async userHabitId => {
  return await UserHabit.findById(userHabitId).populate('habitId');
};

const getUserHabits = async (userId, query, populate) => {
  return await getAllData(UserHabit, {userId, ...query}, populate);
};

const updateUserHabit = async (userHabitId, habit) => {
  return await UserHabit.findByIdAndUpdate(userHabitId, habit, {new: true});
};

const deleteUserHabit = async userHabitId => {
  return await UserHabit.findByIdAndDelete(userHabitId);
};

module.exports = {
  createUserHabit,
  getUserHabit,
  getUserHabits,
  updateUserHabit,
  deleteUserHabit,
};
