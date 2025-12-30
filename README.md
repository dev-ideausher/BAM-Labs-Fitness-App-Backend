# BAM Labs Fitness App Backend

Backend API server for the BAM Labs fitness application. This Node.js application provides RESTful endpoints for managing users, workouts, exercises, habits, and fitness tracking.

## Features

The backend supports a comprehensive fitness platform with the following capabilities:

User management with Firebase authentication
Admin dashboard and user administration
Exercise library for strength training, cardio, and stretching
Workout session tracking and progress monitoring
Habit tracking and goal management
AI-powered fitness chatbot for personalized advice
Push notifications and email notifications
Subscription management
QR code workout sessions
Content management for app notifications and information

## Tech Stack

Node.js with Express
MongoDB with Mongoose
Firebase for authentication
OpenAI for AI chatbot features
JWT for admin authentication
Agenda.js for job scheduling
Node-cron for scheduled tasks
AWS S3 for file storage
Resend for email services
Twilio for SMS notifications

## Getting Started

### Prerequisites

Node.js (v14 or higher)
MongoDB database
Firebase project with service account
Environment variables configured

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory with the following required variables:

```
NODE_ENV=development
PORT=8082
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

SERVICE_ACCOUNT_TYPE=service_account
SERVICE_ACCOUNT_PROJECT_ID=your_service_account_project_id
SERVICE_ACCOUNT_PRIVATE_KEY_ID=your_private_key_id
SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key
SERVICE_ACCOUNT_CLIENT_EMAIL=your_client_email
SERVICE_ACCOUNT_CLIENT_ID=your_client_id
SERVICE_ACCOUNT_AUTH_URI=https://accounts.google.com/o/oauth2/auth
SERVICE_ACCOUNT_TOKEN_URI=https://oauth2.googleapis.com/token
SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
SERVICE_ACCOUNT_CLIENT_X509_CERT_URL=your_cert_url
SERVICE_ACCOUNT_UNIVERSE_DOMAIN=googleapis.com

OTHER_SERVICE_ACCOUNT_TYPE=service_account
OTHER_SERVICE_ACCOUNT_PROJECT_ID=your_other_service_account_project_id
OTHER_SERVICE_ACCOUNT_PRIVATE_KEY_ID=your_other_private_key_id
OTHER_SERVICE_ACCOUNT_PRIVATE_KEY=your_other_private_key
OTHER_SERVICE_ACCOUNT_CLIENT_EMAIL=your_other_client_email
OTHER_SERVICE_ACCOUNT_CLIENT_ID=your_other_client_id
OTHER_SERVICE_ACCOUNT_AUTH_URI=https://accounts.google.com/o/oauth2/auth
OTHER_SERVICE_ACCOUNT_TOKEN_URI=https://oauth2.googleapis.com/token
OTHER_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
OTHER_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL=your_other_cert_url
OTHER_SERVICE_ACCOUNT_UNIVERSE_DOMAIN=googleapis.com

RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_sender_email
OPENAI_API_KEY=your_openai_api_key
```

Optional variables for AWS S3 and Twilio are available but not required if those services are not used.

### Running the Application

Development mode with auto-reload:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on the port specified in your environment variables (default: 8082).

## Project Structure

```
src/
├── app.js                 # Express app configuration
├── index.js               # Application entry point
├── config/                # Configuration files
│   ├── config.js          # Environment variables and settings
│   ├── logger.js          # Winston logger setup
│   ├── morgan.js          # HTTP request logging
│   └── agenda.js          # Job scheduler configuration
├── controllers/           # Request handlers
├── services/              # Business logic and database operations
├── models/                # MongoDB schemas
├── routes/                # API route definitions
│   └── v1/               # Version 1 API routes
├── middlewares/           # Custom middleware functions
├── validations/           # Request validation schemas
├── utils/                 # Utility functions
├── microservices/         # Third-party service integrations
├── Jobs/                  # Scheduled job definitions
└── Bam-Ai-chatbot/       # AI chatbot implementation
```

## API Structure

All API endpoints are versioned under `/v1`. The main route categories include:

User authentication and management
Admin authentication and dashboard
Exercise management (strength, cardio, stretch)
Workout session tracking
Habit tracking and user habits
Notifications (push and email)
Subscriptions
Content management
AI chatbot endpoints
QR code sessions
File uploads

## Scheduled Jobs

The application runs several scheduled tasks:

Daily subscription expiration checks
Workout reminder health checks
Habit notification health checks

These jobs run automatically using node-cron and Agenda.js.

## Security

The application implements several security measures:

Helmet.js for HTTP header security
CORS configuration
MongoDB injection protection
JWT token authentication for admin routes
Firebase authentication for user routes
Password hashing with bcrypt
Input validation on all endpoints

## Error Handling

Errors are handled through a centralized error handling middleware. All errors follow a consistent format with appropriate HTTP status codes.

## Logging

The application uses Winston for application logging and Morgan for HTTP request logging. Logs are configured based on the environment.

## Development

Code formatting is handled by Prettier. Run the formatter with:

```bash
npm run format
```

## License

ISC
