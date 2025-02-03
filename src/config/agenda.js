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
  ensureIndex: true
});

agenda.on('ready', async () => {
  await agenda.start();
  console.log('Agenda started!');
});

agenda.on('error', (err) => {
  console.error('Agenda connection error:', err);
});

module.exports = agenda;