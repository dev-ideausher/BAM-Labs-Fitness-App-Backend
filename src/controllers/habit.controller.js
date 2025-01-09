const {habitService} = require('../services');
const catchAsync = require('../utils/catchAsync');

const addHabit = catchAsync(async (req, res) => {
  const habit = await habitService.addHabit(req.body);
  res.status(200).json({
    status: true,
    message: 'Habit added successfully',
    habit,
  });
});

const addCustomHabit = catchAsync(async (req, res) => {
  const habit = await habitService.createCustomHabit({userId: req.user._id, ...req.body});
  res.status(200).json({
    status: true,
    message: 'Custom habit added successfully',
    habit,
  });
});

const getAllHabits = catchAsync(async (req, res) => {
  const habits = await habitService.getAllHabits({ ...req.query, userId: req.user._id }, []);
  const customHabits = await habitService.getMyHabits(req.user._id, req.query, []);
  res.status(200).json({
    status: true,
    message: 'Habits fetched successfully',
    data: {
      habits,
      customHabits,
    },
  });
});

const getHabitById = catchAsync(async (req, res) => {
  const habit = await habitService.getHabitById(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Habit fetched successfully',
    habit,
  });
});

const updateHabitById = catchAsync(async (req, res) => {
  const habit = await habitService.updateHabitById(req.params.id, req.body);
  res.status(200).json({
    status: true,
    message: 'Habit updated successfully',
    habit,
  });
});

const deleteHabitById = catchAsync(async (req, res) => {
  await habitService.deleteHabitById(req.params.id);
  res.status(200).json({
    status: true,
    message: 'Habit deleted successfully',
  });
});

module.exports = {
  addHabit,
  addCustomHabit,
  getAllHabits,
  getHabitById,
  updateHabitById,
  deleteHabitById,
};
