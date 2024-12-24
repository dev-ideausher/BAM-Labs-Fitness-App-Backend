const {User} = require('./user.model');
const {AppNotification} = require('./appNotification.model');
const {StrengthExercise, CustomStrengthExercise} = require('./strength.exercise.model');
const {StrengthSession, StrengthBestSession} = require('./strength.session.model');
const {CardioSession} = require('./cardio.session.model');
const {StretchSession} = require('./stretch.session.model');
const {Habit, CustomHabit} = require('./habit.model');
const {UserHabit} = require('./user.habit.model');
const {PrimaryCategory} = require('./primary.category,model');
const {TargetedMuscle} = require('./targeted.muscles.model');
const {Admin} = require('./admin.model');
const {ContactUs} = require('./contact.model');

module.exports = {
  User,
  AppNotification,
  PrimaryCategory,
  TargetedMuscle,
  StrengthExercise,
  CustomStrengthExercise,
  StrengthSession,
  StrengthBestSession,
  CardioSession,
  StretchSession,
  Habit,
  CustomHabit,
  UserHabit,
  Admin,
  ContactUs
};
