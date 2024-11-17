const {User} = require('./user.model');
const {AppNotification} = require('./appNotification.model');
const {StrengthExercise, CustomStrengthExercise} = require('./strength.exercise.model');
const {StrengthSession, StrengthBestSession} = require('./strength.session.model');

module.exports = {
  User,
  AppNotification,
  StrengthExercise,
  CustomStrengthExercise,
  StrengthSession,
  StrengthBestSession,
};
