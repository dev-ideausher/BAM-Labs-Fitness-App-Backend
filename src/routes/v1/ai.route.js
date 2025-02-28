const express = require('express');
const router = express.Router();
const {firebaseAuth} = require('../../middlewares/firebaseAuth');
const {aichatbotController} = require('../../controllers');

router.post('/chat', firebaseAuth('user'), aichatbotController.processFitnessQuery);
router.get('/getfiles', aichatbotController.getFiles);
router.delete('/deletefiles', aichatbotController.deleteAllFile);
router.get('/vector-stores', aichatbotController.getAllVectorStore);
router.delete('/vector-delete', aichatbotController.deleteAllVectorStore);
router.get('/chat-history', firebaseAuth('user'), aichatbotController.getChatHistoryFromThread);

module.exports = router;
