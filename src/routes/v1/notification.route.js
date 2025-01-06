const express = require('express');

const {authenticate} = require('../../middlewares/adminAuth');
const {notificationController} = require('../../controllers');
const validate = require('../../middlewares/validate');
const { notificationValidation } = require('../../validations');

const router = express.Router();

router.post('/', authenticate, validate(notificationValidation.notificationJoiSchema), notificationController.createNotification);
router.get('/', authenticate, notificationController.getAllNotifications);
router.delete('/:id', authenticate, notificationController.deleteNotification);

module.exports = router;
