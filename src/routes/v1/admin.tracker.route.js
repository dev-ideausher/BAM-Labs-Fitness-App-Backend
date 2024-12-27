const express = require('express');
const { trackerController } = require('../../controllers');
const { authenticate } = require('../../middlewares/adminAuth');


const router = express.Router();

router.get('/strength-content', authenticate, trackerController.getStrengthContent);
router.get('/habits', authenticate, trackerController.getAllHabits);
router.post('/habits', authenticate, trackerController.createNewHabit);
router.patch('/habits/:id', authenticate, trackerController.updateHabit);
router.delete('/habits/:id', authenticate, trackerController.deleteHabit);





module.exports = router;
