const express = require('express');

const {firebaseAuth} = require('../../middlewares/firebaseAuth');

const {primaryCategoryController} = require('../../controllers');

const router = express.Router();

router.post('/', firebaseAuth('admin'), primaryCategoryController.createPrimaryCategory);

router.get('/', firebaseAuth('All'), primaryCategoryController.getAllPrimaryCategories);

router.get('/:primaryCategoryId', firebaseAuth('user'), primaryCategoryController.getPrimaryCategoryById);

router.patch('/:primaryCategoryId', firebaseAuth('admin'), primaryCategoryController.updatePrimaryCategoryById);

router.delete('/:primaryCategoryId', firebaseAuth('admin'), primaryCategoryController.deletePrimaryCategoryById);

module.exports = router;
