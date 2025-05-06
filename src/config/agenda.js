const {Agenda} = require('agenda');
const config = require('./config');
const logger = require('./logger');

const agendaConfig = {
  db: {
    address: config.mongoose.url,
    collection: 'agendaJobs',
    options: {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 60000,
    },
  },
  processEvery: '1 second',
  defaultConcurrency: 5,
  maxConcurrency: 20,
  lockLimit: 10,
  lockLifetime: 30000,
};

const agenda = new Agenda(agendaConfig);

agenda.on('ready', () => {
  logger.info('Agenda connected to MongoDB and ready for job processing');
});

agenda.on('error', err => {
  logger.error(`Agenda encountered an error: ${err.message}`, {error: err.stack});
  if (err.name === 'MongoNetworkError' || err.message.includes('topology') || err.message.includes('connection')) {
    handleConnectionFailure();
  }
});

agenda.on('start', job => {
  logger.info(`Job starting: ${job.attrs.name}`, {
    jobId: job.attrs._id,
  });
});

agenda.on('success', job => {
  logger.info(`Job completed successfully: ${job.attrs.name}`, {
    jobId: job.attrs._id,
  });
});

agenda.on('fail', (err, job) => {
  logger.error(`Job failed: ${job.attrs.name}`, {
    jobId: job.attrs._id,
    error: err.message,
  });
  if (job.attrs.failCount < 5) {
    const backoff = Math.pow(2, job.attrs.failCount) * 1000;
    const nextRun = new Date(new Date().getTime() + backoff);

    logger.info(`Rescheduling failed job: ${job.attrs.name}`, {
      jobId: job.attrs._id,
      failCount: job.attrs.failCount,
      nextRunAt: nextRun,
    });

    job.schedule(nextRun);
    job.save().catch(saveErr => {
      logger.error(`Failed to reschedule job: ${saveErr.message}`);
    });
  }
});

let reconnecting = false;

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

function handleConnectionFailure() {
  if (reconnecting) return;

  reconnecting = true;
  reconnectAttempts++;

  const backoffTime = Math.min(30000, Math.pow(2, reconnectAttempts) * 1000);

  logger.warn(
    `MongoDB connection issue detected. Attempt ${reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS}. Will retry in ${backoffTime /
      1000} seconds.`
  );

  setTimeout(() => {
    logger.info('Attempting to reconnect Agenda to MongoDB...');
    agenda
      .stop()
      .then(() => agenda.start())
      .then(() => {
        logger.info('Agenda successfully reconnected to MongoDB');
        reconnecting = false;
        reconnectAttempts = 0;
      })
      .catch(err => {
        logger.error(`Failed to reconnect Agenda: ${err.message}`);
        reconnecting = false;

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        } else {
          logger.error('Maximum reconnection attempts reached. Agenda may not be functioning properly.');
          reconnectAttempts = 0;
        }
      });
  }, backoffTime);
}

function startAgenda() {
  agenda
    .start()
    .then(() => {
      logger.info('Agenda started successfully');
    })
    .catch(err => {
      logger.error(`Failed to start Agenda: ${err.message}`);
      handleConnectionFailure();
    });
}

async function gracefulShutdown() {
  logger.info('Shutting down Agenda gracefully');
  try {
    await agenda.stop();
    logger.info('Agenda stopped gracefully');
  } catch (err) {
    logger.error(`Error stopping Agenda: ${err.message}`);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});

startAgenda();

module.exports = agenda;
