const express = require('express');
const validate = require('../../middlewares/validate');
const { contactUsValidation } = require('../../validations');
const { contactUsController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');
const { firebaseAuth } = require('../../middlewares/firebaseAuth');


const router = express.Router();

router.post('/',firebaseAuth('user') ,validate(contactUsValidation.supportRequestValidationSchema), contactUsController.createSupportRequest);
router.get('/all',authenticate ,contactUsController.getAllSupportRequests);
router.get('/request/:id',authenticate ,contactUsController.getSupportRequestById);
router.delete('/delete/:id',authenticate ,contactUsController.deleteSupportRequestById);
router.get('/prevcomplaints',authenticate ,contactUsController.getAllComplaintsByUserId);

module.exports = router;
