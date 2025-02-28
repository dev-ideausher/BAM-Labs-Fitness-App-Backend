const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Exercise = require('../models/excercise.model');
const config = require('../config/config');

const files = {
  Basic: path.join(__dirname, '..', '..', 'data', 'Updated_Basic_Exercises.json'),
  Intermediate: path.join(__dirname, '..', '..', 'data', 'Updated_Intermediate_Exercises.json'),
  Advanced: path.join(__dirname, '..', '..', 'data', 'Advanced_Exercises_Final_Updated.json'),
};

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(async () => {
    console.log('Connected to MongoDB for importing exercises.');

    for (const level in files) {
      const filePath = files[level];
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(data);

        let exercises = [];
        if (Array.isArray(parsedData)) {
          exercises = parsedData;
        } else if (parsedData.exercises && Array.isArray(parsedData.exercises)) {
          exercises = parsedData.exercises;
        } else if (parsedData.Sheet1 && Array.isArray(parsedData.Sheet1)) {
          exercises = parsedData.Sheet1;
        } else {
          console.error(`Expected an array of exercises in ${filePath}.`);
          continue;
        }

        for (const exercise of exercises) {
          const exerciseData = {
            ...exercise,
            id: exercise.Id || exercise.id,
          };

          await Exercise.findOneAndUpdate({id: exerciseData.id}, exerciseData, {upsert: true, new: true});
        }
        console.log(`Imported ${exercises.length} ${level} exercises from ${filePath}.`);
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
      }
    }

    mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB for import:', err);
  });
