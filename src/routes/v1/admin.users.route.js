const express = require('express');
const { adminUserController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');
const categoryController = require('../../controllers/category.controller');

const router = express.Router();

router.get('/:type',authenticate,  adminUserController.getUsers);
router.patch('/verify/:userId', authenticate,adminUserController.verifyUser);

router.patch('/status/:userId', authenticate,adminUserController.modifyUserStatus);
router.get('/user/:userId', authenticate,adminUserController.getUserDetails);
router.get('/session/:userId', authenticate,adminUserController.getsessionDetails);
router.post('/create-category', authenticate, categoryController.createCategory);
module.exports = router;
