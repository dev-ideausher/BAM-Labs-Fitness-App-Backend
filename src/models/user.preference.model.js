const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true},
    language: {type: String, default: null},
    unitSystem: {type: String, enum: ['metric', 'imperial'], default: 'metric'},
    logType: {type: String, enum: ['average', 'bySet'], default: 'average'},
  },
  {timestamps: true}
);

userPreferenceSchema.plugin(paginate);

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

module.exports = {UserPreference};


