const express = require('express');
const router = express.Router();
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {aichatbotController }= require('../../controllers');

router.post('/chat', firebaseAuth('user'), aichatbotController.processWorkoutQuery);

module.exports = router;