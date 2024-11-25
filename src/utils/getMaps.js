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
  for (let i = 0; i < 8; i++) {
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

module.exports = {
  getWeeklySessionsMap,
  getMonthlySessionsMap,
};
