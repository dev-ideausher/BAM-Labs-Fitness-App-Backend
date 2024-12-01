const {User} = require('./user.model');
const {AppNotification} = require('./appNotification.model');
const {StrengthExercise, CustomStrengthExercise} = require('./strength.exercise.model');
const {StrengthSession, StrengthBestSession} = require('./strength.session.model');
const {CardioSession} = require('./cardio.session.model');
const {StretchSession} = require('./stretch.session.model');
const {Habit, CustomHabit} = require('./habit.model');

module.exports = {
  User,
  AppNotification,
  StrengthExercise,
  CustomStrengthExercise,
  StrengthSession,
  StrengthBestSession,
  CardioSession,
  StretchSession,
  Habit,
  CustomHabit,
};
