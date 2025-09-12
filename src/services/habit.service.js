const {Habit, CustomHabit} = require('../models');
const {getAllData} = require('../utils/getAllData');
const Category = require('../models/category.model')

const addHabit = async habit => {
  return await Habit.create(habit);
};

const createCustomHabit = async (habit) => {
  const existingHabit = await CustomHabit.findOne({
    // name: habit.name,
    name: { $regex: new RegExp(`^${habit.name}$`, 'i') },
    userId: habit.userId
  });

  if (existingHabit) {
    throw new Error('You have already created a habit with this name');
  }

   if (habit.category) {
    const catExists = await Category.exists({ _id: habit.category });
    if (!catExists) {
      throw new Error('Category not found');
    }
  }

  const created = await CustomHabit.create(habit);
  return CustomHabit.findById(created._id).populate('category');
};

const getAllHabits = async (query, populateConfig) => {
  const { userId, ...otherQuery } = query;
  
  const data = await getAllData(Habit, {
    $or: [
      { __t: null },
      { __t: 'CustomHabit', userId },
      { __t: 'CustomHabit', publicVisibility: true } 
    ],
    ...otherQuery
  }, populateConfig);
  
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
