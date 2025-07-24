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
router.get('/db', firebaseAuth('user'), aichatbotController.getChatHistoryFromDB);
router.delete('/db', firebaseAuth('user'), aichatbotController.clearChatHistoryEndpoint);
router.delete('/threads', aichatbotController.deleteThreads);

module.exports = router;
