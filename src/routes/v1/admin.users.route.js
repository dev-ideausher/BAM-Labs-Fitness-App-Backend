const express = require('express');
const { adminUserController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');


const router = express.Router();

router.get('/:type',authenticate,  adminUserController.getUsers);
router.patch('/verify/:userId', authenticate,adminUserController.verifyUser);

router.patch('/status/:userId', authenticate,adminUserController.modifyUserStatus);
router.get('/user/:userId', authenticate,adminUserController.getUserDetails);
router.get('/session/:userId', authenticate,adminUserController.getsessionDetails);
module.exports = router;
