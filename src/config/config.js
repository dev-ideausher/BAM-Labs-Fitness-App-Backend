const Joi = require('joi');
const path = require('path');
const dotnev = require('dotenv');
const { OpenAI } = require('openai');

dotnev.config({path: path.join(__dirname, '../../.env')});

// schema of env files for validation
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid('test', 'development', 'production')
      .required(),
    PORT: Joi.number().default(8082),
    MONGODB_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    // TWILIO_PHONE: Joi.string().required(),
    // TWILIO_SID: Joi.string().required(),
    // TWILIO_AUTH_TOKEN: Joi.string().required(),
    // AWS_S3_SECRET_ACCESS_KEY: Joi.string().required(),
    // AWS_S3_REGION: Joi.string().required(),
    // AWS_S3_ACCESS_KEY_ID: Joi.string().required(),
    // AWS_S3_BUCKET: Joi.string().required(),
    FIREBASE_API_KEY: Joi.string().required(),
    FIREBASE_AUTH_DOMAIN: Joi.string().required(),
    FIREBASE_PROJECT_ID: Joi.string().required(),
    FIREBASE_STORAGE_BUCKET: Joi.string().required(),
    FIREBASE_MESSAGING_SENDER_ID: Joi.string().required(),
    FIREBASE_APP_ID: Joi.string().required(),
    FIREBASE_MEASUREMENT_ID: Joi.string().required(),
    SERVICE_ACCOUNT_TYPE: Joi.string().required(),
    SERVICE_ACCOUNT_PROJECT_ID: Joi.string().required(),
    SERVICE_ACCOUNT_PRIVATE_KEY_ID: Joi.string().required(),
    SERVICE_ACCOUNT_PRIVATE_KEY: Joi.string().required(),
    SERVICE_ACCOUNT_CLIENT_EMAIL: Joi.string().required(),
    SERVICE_ACCOUNT_CLIENT_ID: Joi.string().required(),
    SERVICE_ACCOUNT_AUTH_URI: Joi.string().required(),
    SERVICE_ACCOUNT_TOKEN_URI: Joi.string().required(),
    SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL: Joi.string().required(),
    SERVICE_ACCOUNT_CLIENT_X509_CERT_URL: Joi.string().required(),
    SERVICE_ACCOUNT_UNIVERSE_DOMAIN: Joi.string().required(),
    
  RESEND_API_KEY: Joi.string().required(),
  RESEND_FROM_EMAIL: Joi.string().email().required(),
  OPENAI_API_KEY: Joi.string().required(),
  })
  .unknown();

// validating the process.env object that contains all the env variables
const {value: envVars, error} = envVarsSchema.prefs({errors: {label: 'key'}}).validate(process.env);

// throw error if the validation fails or results into false
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const openai = new OpenAI({
  apiKey: envVars.OPENAI_API_KEY,
});

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwtSecret:envVars.JWT_SECRET,
  twilio: {
    sid: envVars.TWILIO_SID,
    phone: envVars.TWILIO_PHONE,
    authToken: envVars.TWILIO_AUTH_TOKEN,
  },
  aws: {
    s3: {
      name: envVars.AWS_S3_BUCKET,
      region: envVars.AWS_S3_REGION,
      accessKeyId: envVars.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: envVars.AWS_S3_SECRET_ACCESS_KEY,
    },
  },
  mongoose: {
    // exception added for TDD purpose
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  firebase: {
    apiKey: envVars.FIREBASE_API_KEY,
    authDomain: envVars.FIREBASE_AUTH_DOMAIN,
    projectId: envVars.FIREBASE_PROJECT_ID,
    storageBucket: envVars.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.FIREBASE_APP_ID,
    measurementId: envVars.FIREBASE_MEASUREMENT_ID,
  },
  serviceAccount: {
    type: envVars.SERVICE_ACCOUNT_TYPE,
    project_id: envVars.SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: envVars.SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: envVars.SERVICE_ACCOUNT_PRIVATE_KEY,
    client_email: envVars.SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: envVars.SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: envVars.SERVICE_ACCOUNT_AUTH_URI,
    token_uri: envVars.SERVICE_ACCOUNT_TOKEN_URI,
    auth_provider_x509_cert_url: envVars.SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: envVars.SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universe_domain: envVars.SERVICE_ACCOUNT_UNIVERSE_DOMAIN,
  },
  resend: {
    apiKey: envVars.RESEND_API_KEY,
    fromEmail: envVars.RESEND_FROM_EMAIL,
  },
  openai,
};
