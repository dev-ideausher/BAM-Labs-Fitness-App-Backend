require('dotenv').config();
// Import the functions you need from the SDKs you need
const {initializeApp} = require('firebase/app');
const config = require('./src/config/config');

const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
  measurementId: config.firebase.measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

module.exports = app;
