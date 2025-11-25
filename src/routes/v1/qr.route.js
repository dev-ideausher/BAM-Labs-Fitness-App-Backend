const express = require('express');
const validate = require('../../middlewares/validate');
const { firebaseAuth } = require('../../middlewares/firebaseAuth');
const { qrValidation } = require('../../validations');
const { qrController } = require('../../controllers');

const router = express.Router();

router.post('/create', qrController.createQRSession);

router.post(
  '/approve',
  validate(qrValidation.approveQRSession),
  firebaseAuth('All'),
  qrController.approveQRSession
);

router.get('/status', validate(qrValidation.getQRSessionStatus), qrController.getQRSessionStatus);

module.exports = router;

