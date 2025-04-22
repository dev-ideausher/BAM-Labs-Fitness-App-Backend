const {scheduleWorkoutReminder} = require('./workoutReminder.controller');
const Agenda = require('agenda');
const {sendToTopic} = require('../microservices/notification.service');

jest.mock('../microservices/notification.service');
jest.mock('agenda', () => {
  const mockAgenda = {
    define: jest.fn(),
    cancel: jest.fn(),
    every: jest.fn(),
    jobs: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    start: jest.fn(),
  };

  function AgendaMock() {
    return mockAgenda;
  }

  AgendaMock.prototype = mockAgenda;
  return AgendaMock;
});

describe('Workout Reminder Service', () => {
  let agenda;

  beforeAll(() => {
    agenda = new Agenda();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('should schedule a workout reminder for the user and execute consistently over 30 days', async () => {
    const reminderTime = new Date();
    reminderTime.setMinutes(reminderTime.getMinutes() + 1);
    const offset = 330;
    const userId = 'testUserId';

    await scheduleWorkoutReminder(reminderTime, offset, userId);
    expect(agenda.every).toHaveBeenCalled();
    expect(agenda.every).toHaveBeenCalledWith(expect.any(String), expect.any(String), {userId}, {timezone: 'UTC'});

    jest.advanceTimersByTime(60000);
    const job = {
      attrs: {
        name: `workout-reminder-${userId}`,
        data: {userId},
      },
    };

    const jobFunction = agenda.define.mock.calls[0][1];
    await jobFunction(job);
    expect(sendToTopic).toHaveBeenCalledWith(
      userId,
      `user_${userId}`,
      {
        title: 'Workout Time! 💪',
        body: "It's time for your scheduled workout. Let's get moving!",
      },
      {
        type: 'WORKOUT_REMINDER',
        timestamp: expect.any(String),
      }
    );

    jest.advanceTimersByTime(30 * 24 * 60 * 60 * 1000);

    await scheduleWorkoutReminder(reminderTime, offset, userId);
    await jobFunction(job);
    expect(sendToTopic).toHaveBeenCalledTimes(2);
    expect(agenda.every).toHaveBeenCalledTimes(2);
  });

  test('should reschedule the job if not found', async () => {
    const reminderTime = new Date();
    reminderTime.setMinutes(reminderTime.getMinutes() + 1);
    const offset = 330;
    const userId = '673a5f3dc1aacdc8f93841cb';

    agenda.jobs.mockResolvedValueOnce([]);

    await scheduleWorkoutReminder(reminderTime, offset, userId);
    expect(agenda.every).toHaveBeenCalled();
    expect(agenda.every).toHaveBeenCalledWith(expect.any(String), expect.any(String), {userId}, {timezone: 'UTC'});
  });
});
