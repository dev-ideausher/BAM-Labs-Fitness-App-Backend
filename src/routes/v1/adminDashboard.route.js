const express = require('express');
const adminDashboardController = require('../../controllers/admindashboard.controller');
const {authenticate} = require('../../middlewares/adminAuth');
const {subscriptionController} = require('../../controllers');

const router = express.Router();

router.get('/age-gender-distribution', authenticate, adminDashboardController.getAgeGenderDistribution);
router.get('/signup-summary', authenticate, adminDashboardController.getSignupSummary);
router.get('/user-activity', authenticate, adminDashboardController.getTimeAnalytics);
router.get('/excercise-activity', authenticate, adminDashboardController.getExerciseDistribution);
router.get('/user-stats', authenticate, adminDashboardController.getUserAnalytics);
router.get('/habbit-stats', authenticate, adminDashboardController.getHabitAnalytics);
router.get('/subscription-stats', authenticate, adminDashboardController.getSubscriptionStats);
router.get('/subscriptionDetails', authenticate, subscriptionController.getVerificationDetails);
router.get('/user-subscriptions', authenticate, adminDashboardController.getAllUserSubscriptions);

module.exports = router;
