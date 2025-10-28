const express = require('express');

const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {habitController} = require('../../controllers');
const categoryController = require('../../controllers/category.controller');
const router = express.Router();

router.get('/categories', categoryController.getAllCategories);
router.post('/', firebaseAuth('admin'), habitController.addHabit);

router.post('/custom', firebaseAuth('All'), habitController.addCustomHabit);

router.get('/', firebaseAuth('All'), habitController.getAllHabits);

router.get('/:id', firebaseAuth('All'), habitController.getHabitById);

router.patch('/:id', firebaseAuth('admin'), habitController.updateHabitById);

router.delete('/:id', firebaseAuth('admin'), habitController.deleteHabitById);

module.exports = router;
