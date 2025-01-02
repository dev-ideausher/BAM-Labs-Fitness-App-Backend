const express = require('express');
const { contentController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');
const { firebaseAuth } = require('../../middlewares/firebaseAuth');
const validate = require('../../middlewares/validate');
const { contactUsValidation } = require('../../validations');



const router = express.Router();


router.get('/', authenticate, contentController.getAllContents);
router.get('/app', firebaseAuth('user'),validate(contactUsValidation.getContentTypeValidationSchema), contentController.getContentByType)
router.post('/', authenticate, contentController.createContent);
router.get("/:id", authenticate, contentController.getContentById);
router.put("/:id", authenticate, contentController.updateContent);

router.delete("/:id", authenticate, contentController.deleteContent);


module.exports = router;
