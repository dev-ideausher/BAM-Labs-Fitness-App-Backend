const {Habit, CustomHabit} = require('../models');
const {getAllData} = require('../utils/getAllData');

const addHabit = async habit => {
  return await Habit.create(habit);
};

const createCustomHabit = async habit => {
  return await CustomHabit.create(habit);
};

const getAllHabits = async (query, populateConfig) => {
  const data = await getAllData(Habit, query, populateConfig);
  return data;
};

const getMyHabits = async (userId, query, populateConfig) => {
  const data = await getAllData(CustomHabit, {userId, ...query}, populateConfig);
  return data;
};

const getHabitById = async id => {
  return await Habit.findById(id);
};

const updateHabitById = async (id, update) => {
  return await Habit.findByIdAndUpdate(id, update);
};

const deleteHabitById = async id => {
  return await Habit.findByIdAndDelete(id);
};

module.exports = {
  addHabit,
  createCustomHabit,
  getAllHabits,
  getMyHabits,
  getHabitById,
  updateHabitById,
  deleteHabitById,
};
