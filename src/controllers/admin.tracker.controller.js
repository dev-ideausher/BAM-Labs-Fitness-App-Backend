const { trackerService } = require("../services");
const catchAsync = require("../utils/catchAsync");



const getStrengthContent = catchAsync(async (req, res) => {

    const data = await trackerService.getStrengthContent();
    res.status(200).json({
        status: true,
        message: 'Strength content fetched successfully',
        data:data
    });
});

const getAllHabits = catchAsync(async (req, res) => {
    const {page, limit} = req.query;
    const data = await trackerService.getAllHabits({page, limit});
    res.status(200).json({
        status: true,
        message: 'Habits fetched successfully',
        data:data
    });
});
const createNewHabit = catchAsync(async (req, res) => {
    const {name} = req.body;
    const habit = await trackerService.createNewHabit({name});
    res.status(200).json({
        status: true,
        message: 'Habit created successfully',
        habit:habit
    });
});

const updateHabit = catchAsync(async (req, res) => {
    const {id} = req.params;
    const {name} = req.body;
    const habit = await trackerService.updateHabit({id, name});
    res.status(200).json({
        status: true,
        message: 'Habit updated successfully',
        habit:habit
    });
});


const deleteHabit = catchAsync(async (req, res) => {
    const {id} = req.params;
    const habit = await trackerService.deleteHabit({id});
    res.status(200).json({
        status: true,
        message: 'Habit deleted successfully',
        habit:habit
    });
});

// create new strength content
const createStrengthContent = catchAsync(async (req, res) => {
    const {name, image, targetMuscle} = req.body;
    const strengthContent = await trackerService.createStrengthContent({name, image, targetMuscle});
    res.status(200).json({
        status: true,
        message: 'Strength content created successfully',
        strengthContent
    });
});


const getSpecificCategory = catchAsync(async (req, res) => {
    const {id} = req.params;
    const strengthContent = await trackerService.getSpecificCategory(id);
    res.status(200).json({
        status: true,
        message: 'Strength content fetched successfully',
        strengthContent
    });
});

module.exports = {
    getStrengthContent,
    getAllHabits,
    getSpecificCategory,
    createNewHabit,
    updateHabit,
    createStrengthContent,
    deleteHabit
}