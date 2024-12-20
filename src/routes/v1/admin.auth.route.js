const express = require('express');
const { adminAuthController } = require('../../controllers');
const validate = require('../../middlewares/validate');
const { adminAuthValidation } = require('../../validations');


const router = express.Router();

router.post('/login', validate(adminAuthValidation.loginAdminValidation), adminAuthController.loginAdmin);
router.post('/register', validate(adminAuthValidation.registerAdminValidation), adminAuthController.registerAdmin);



module.exports = router;
