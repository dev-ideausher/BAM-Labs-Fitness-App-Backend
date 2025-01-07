const express = require('express');
const adminDashboardController = require('../../controllers/admindashboard.controller');
const {authenticate} = require('../../middlewares/adminAuth');

const router = express.Router();

router.get('/age-gender-distribution', authenticate, adminDashboardController.getAgeGenderDistribution);
router.get('/signup-summary', authenticate, adminDashboardController.getSignupSummary);
router.get('/user-activity', authenticate, adminDashboardController.getTimeAnalytics);
router.get('/excercise-activity', authenticate, adminDashboardController.getExerciseDistribution);
router.get('/user-stats', authenticate, adminDashboardController.getUserAnalytics);
router.get('/habbit-stats', authenticate, adminDashboardController.getHabitAnalytics);
module.exports = router;
