const getWeeklySessionsMap = async (model, findQuery) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 6 days ago + today = 7 days

  // Fetch sessions from the last 7 days
  const sessions = await model
    .find({
      ...findQuery,
      dateTime: {$gte: sevenDaysAgo},
    })
    .sort({dateTime: 1});

  const dateArray = [];
  // Generate date mappings for the last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    dateArray.push({
      date: dateString,
      sessionMarked: false,
    });
  }

  // Mark dates where sessions were logged
  sessions.forEach(session => {
    const dateString = session.dateTime.toISOString().split('T')[0];
    const dateObject = dateArray.find(item => item.date === dateString);
    if (dateObject) {
      dateObject.sessionMarked = true;
    }
  });

  return dateArray;
};

const getMonthlySessionsMap = async (model, findQuery, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of the month

  // Fetch sessions for the specified month
  const sessions = await model
    .find({
      ...findQuery,
      dateTime: {$gte: startDate, $lte: endDate},
    })
    .sort({dateTime: 1});

  const dateArray = [];
  const daysInMonth = endDate.getDate() + 1;

  // Initialize mapping for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateString = date.toISOString().split('T')[0];
    dateArray.push({
      date: dateString,
      sessionMarked: false,
    });
  }

  // Mark dates where sessions were logged
  sessions.forEach(session => {
    const dateString = session.dateTime.toISOString().split('T')[0];
    const dateObject = dateArray.find(item => item.date === dateString);
    if (dateObject) {
      dateObject.sessionMarked = true;
    }
  });

  return dateArray;
};
const getMapsByDate = async (model, findQuery, startDate, endDate) => {
  const nextDay = new Date(endDate);
  nextDay.setDate(endDate.getDate() + 1);
  const sessions = await model
    .find({
      ...findQuery,
      dateTime: {$gte: startDate, $lte: nextDay},
    })
    .sort({dateTime: 1});

  const dateArray = [];
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    const dateString = date.toISOString().split('T')[0];
    dateArray.push({
      date: dateString,
      sessionMarked: false,
    });
  }

  sessions.forEach(session => {
    const dateString = session.dateTime.toISOString().split('T')[0];
    const dateObject = dateArray.find(item => item.date === dateString);
    if (dateObject) {
      dateObject.sessionMarked = true;
    }
  });
  return dateArray;
};
const getMapsByDateForHabitLog = async (model, findQuery, startDate, endDate) => {
  const nextDay = new Date(endDate);
  nextDay.setDate(endDate.getDate() + 1);

  // Fetch sessions with userHabitId populated to get numberOfTimes
  const sessions = await model
    .find({
      ...findQuery,
      dateTime: { $gte: startDate, $lte: nextDay },
    })
    .populate({
      path: 'userHabitId',
      select: 'numberOfTimes',
    })
    .sort({ dateTime: 1 });

  const dateArray = [];
  const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    const dateString = date.toISOString().split('T')[0];
    dateArray.push({
      date: dateString,
      sessionMarked: false,
      completed: false, // To check if the goal for the day is completed
      numberOfTimes: null, // Placeholder for numberOfTimes
      counterForDay: null, // Placeholder for counterForDay
      startTime: null,
      endTime: null,
    });
  }

  sessions.forEach(session => {
    const dateString = session.dateTime.toISOString().split('T')[0];
    const dateObject = dateArray.find(item => item.date === dateString);
    dateObject.startTime = session.createdAt
    dateObject.endTime = session.updatedAt
    if (dateObject) {
      dateObject.sessionMarked = true;

      // Add numberOfTimes and counterForDay to response
      dateObject.numberOfTimes = session.userHabitId ? session.userHabitId.numberOfTimes : null;
      dateObject.counterForDay = session.counterForDay;

      // Check if numberOfTimes === counterForDay
      if (
        session.userHabitId &&
        session.userHabitId.numberOfTimes === session.counterForDay
      ) {
        dateObject.completed = true;
      }
    }
  });

  return dateArray;
};

module.exports = {
  getWeeklySessionsMap,
  getMonthlySessionsMap,
  getMapsByDate,
  getMapsByDateForHabitLog
};
