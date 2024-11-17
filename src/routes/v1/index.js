const express = require('express');

const userRoute = require('./user.route');
const authRoute = require('./auth.route');
const appNotificationRoute = require('./appNotification.route');
const strengthExerciseRoute = require('./strength.exercise.route');
const strengthSessionRoute = require('./strength.session.route');

const router = express.Router();

router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/notifications', appNotificationRoute);
router.use('/strength-exercises', strengthExerciseRoute);
router.use('/strength-sessions', strengthSessionRoute);

module.exports = router;
