const express = require('express');

const userRoute = require('./user.route');
const authRoute = require('./auth.route');
const appNotificationRoute = require('./appNotification.route');
const primaryCategoryRoute = require('./primary.category.route');
const targetedMuscleRoute = require('./targeted.muscle.route');
const strengthExerciseRoute = require('./strength.exercise.route');
const strengthSessionRoute = require('./strength.session.route');
const cardioSessionRoute = require('./cardio.session.route');
const stretchSessionRoute = require('./stretch.session.route');
const habitRoute = require('./habit.route');
const userHabitRoute = require('./user.habit.route');
const userHabitSessionRoute = require('./user.habit.session.route');
const adminAuthRoute = require('./admin.auth.route');

const router = express.Router();

router.get('/status', (req, res) => res.send('OK! Server is up and running! 🚀 :)'));
router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/notifications', appNotificationRoute);
router.use('/primary-category', primaryCategoryRoute);
router.use('/targeted-muscles', targetedMuscleRoute);
router.use('/strength-exercises', strengthExerciseRoute);
router.use('/strength-sessions', strengthSessionRoute);
router.use('/cardio-sessions', cardioSessionRoute);
router.use('/stretch-sessions', stretchSessionRoute);
router.use('/habits', habitRoute);
router.use('/user-habits', userHabitRoute);
router.use('/user-habit-session', userHabitSessionRoute);


// admin routes
router.use('/admin/auth', adminAuthRoute);

module.exports = router;
