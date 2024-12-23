const express = require('express');
const { adminUserController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');


const router = express.Router();

router.get('/:type',authenticate,  adminUserController.getUsers);



module.exports = router;
