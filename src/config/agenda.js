const Agenda = require('agenda');
const config = require('./config');

const agenda = new Agenda({
  db: {
    address: config.mongoose.url,
    collection: 'agendaJobs',
    options: { 
      useUnifiedTopology: true,
      useNewUrlParser: true
    }
  },
  processEvery: '1 minute',
  defaultConcurrency: 5,
  maxConcurrency: 20,
  lockLimit: 0,
  defaultLockLimit: 0,
  defaultLockLifetime: 10 * 60 * 1000,
  ensureIndex: true
});

agenda.on('ready', async () => {
  await agenda.start();
  console.log('Agenda started!');
});

agenda.on('error', (err) => {
  console.error('Agenda connection error:', err);
});

agenda.on('start', job => {
  console.log(`Job ${job.attrs.name} starting at ${new Date()}`);
});

agenda.on('complete', job => {
  console.log(`Job ${job.attrs.name} completed at ${new Date()}`);
});

agenda.on('fail', (err, job) => {
  console.error(`Job ${job.attrs.name} failed with error: ${err.message}`);
});

module.exports = agenda;