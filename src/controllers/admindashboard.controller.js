const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const {User, StrengthSession, CardioSession, StretchSession, Habit, UserHabit} = require('../models');
const {UserHabitLog} = require('../models/userHabitLog.model');
const Subscription = require('../models/subscription.model');
const {getPaginateConfig} = require('../utils/queryPHandler');
const axios = require('axios');

const getAgeGenderDistribution = catchAsync(async (req, res, next) => {
  const users = await User.find({
    isDeleted: false,
    dob: {$exists: true},
    gender: {$exists: true},
  });

  if (!users || users.length === 0) {
    throw new ApiError(404, 'No user data found');
  }

  const ageGroups = ['0-18', '18-30', '30-45', '45-60', '>60'];
  const distribution = ageGroups.reduce((acc, group) => {
    acc[group] = {male: 0, female: 0, other: 0, total: 0};
    return acc;
  }, {});

  const calculateAge = dob => {
    const now = new Date();
    const birthDate = new Date(dob);
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getAgeGroup = age => {
    if (age < 18) return '0-18';
    if (age <= 30) return '18-30';
    if (age <= 45) return '30-45';
    if (age <= 60) return '45-60';
    if (age > 60) return '>60';
    return null;
  };

  users.forEach(user => {
    const age = calculateAge(user.dob);
    const ageGroup = getAgeGroup(age);

    if (ageGroup) {
      const gender = user.gender.toLowerCase();
      if (!['male', 'female', 'other'].includes(gender)) {
        throw new ApiError(400, 'Invalid gender value found in data');
      }
      distribution[ageGroup][gender]++;
      distribution[ageGroup].total++;
    }
  });

  const response = ageGroups.map(group => {
    const {male, female, other, total} = distribution[group];
    const percentageOfTotal = ((total / users.length) * 100).toFixed(2);
    return {
      ageGroup: group,
      male: total ? Number(((male / total) * 100).toFixed(2)) : 0,
      female: total ? Number(((female / total) * 100).toFixed(2)) : 0,
      other: total ? Number(((other / total) * 100).toFixed(2)) : 0,
      percentageOfTotal: Number(percentageOfTotal),
    };
  });

  res.status(200).json({
    success: true,
    data: response,
    message: 'Age and gender distribution retrieved successfully',
  });
});

const getSignupSummary = catchAsync(async (req, res) => {
  const {interval} = req.query;

  if (!['weekly', 'monthly', 'yearly'].includes(interval)) {
    throw new ApiError(400, "Invalid interval specified. Use 'weekly', 'monthly', or 'yearly'.");
  }

  const currentDate = new Date();
  let startDate, groupBy, dateFormat;

  switch (interval) {
    case 'weekly':
      startDate = new Date(currentDate.setDate(currentDate.getDate() - 7)); // Last 7 days
      groupBy = {$dayOfWeek: '$createdAt'};
      dateFormat = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      break;

    case 'monthly':
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      groupBy = {
        $switch: {
          branches: [
            {case: {$lte: [{$dayOfMonth: '$createdAt'}, 7]}, then: 'Week 1'},
            {
              case: {
                $and: [{$gt: [{$dayOfMonth: '$createdAt'}, 7]}, {$lte: [{$dayOfMonth: '$createdAt'}, 14]}],
              },
              then: 'Week 2',
            },
            {
              case: {
                $and: [{$gt: [{$dayOfMonth: '$createdAt'}, 14]}, {$lte: [{$dayOfMonth: '$createdAt'}, 21]}],
              },
              then: 'Week 3',
            },
            {
              case: {
                $and: [{$gt: [{$dayOfMonth: '$createdAt'}, 21]}, {$lte: [{$dayOfMonth: '$createdAt'}, 28]}],
              },
              then: 'Week 4',
            },
            {
              case: {$gt: [{$dayOfMonth: '$createdAt'}, 28]},
              then: 'Week 5',
            },
          ],
          default: 'Unknown Week',
        },
      };
      dateFormat = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
      break;

    case 'yearly':
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      groupBy = {$month: '$createdAt'};
      dateFormat = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      break;
  }

  const signupSummary = await User.aggregate([
    {
      $match: {
        createdAt: {$gte: startDate},
      },
    },
    {
      $group: {
        _id: groupBy,
        count: {$sum: 1},
      },
    },
    {
      $sort: {_id: 1},
    },
  ]);

  const formattedSummary = dateFormat.map((label, index) => {
    let dataPoint;

    if (interval === 'weekly') {
      dataPoint = signupSummary.find(item => item._id === index + 1);
    } else if (interval === 'yearly') {
      dataPoint = signupSummary.find(item => item._id === index + 1);
    } else {
      dataPoint = signupSummary.find(item => item._id === label);
    }

    return {
      label,
      totalSignups: dataPoint ? dataPoint.count : 0,
    };
  });

  res.status(200).json({
    status: true,
    data: {
      interval,
      summary: formattedSummary,
    },
    message: 'Signup summary retrieved successfully.',
  });
});

const getTimeAnalytics = catchAsync(async (req, res) => {
  const {interval} = req.query;

  if (!['weekly', 'monthly', 'yearly'].includes(interval)) {
    throw new ApiError(400, "Invalid interval. Use 'weekly', 'monthly', or 'yearly'.");
  }

  const now = new Date();
  let startDate, groupBy, dateFormat;

  switch (interval) {
    case 'weekly':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      groupBy = {$dayOfWeek: '$dateTime'};
      dateFormat = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      break;

    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupBy = {
        $switch: {
          branches: [
            {case: {$lte: [{$dayOfMonth: '$dateTime'}, 7]}, then: 'Week 1'},
            {
              case: {
                $and: [{$gt: [{$dayOfMonth: '$dateTime'}, 7]}, {$lte: [{$dayOfMonth: '$dateTime'}, 14]}],
              },
              then: 'Week 2',
            },
            {
              case: {
                $and: [{$gt: [{$dayOfMonth: '$dateTime'}, 14]}, {$lte: [{$dayOfMonth: '$dateTime'}, 21]}],
              },
              then: 'Week 3',
            },
            {
              case: {
                $and: [{$gt: [{$dayOfMonth: '$dateTime'}, 21]}, {$lte: [{$dayOfMonth: '$dateTime'}, 28]}],
              },
              then: 'Week 4',
            },
            {
              case: {$gt: [{$dayOfMonth: '$dateTime'}, 28]},
              then: 'Week 5',
            },
          ],
          default: 'Unknown Week',
        },
      };
      dateFormat = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
      break;

    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      groupBy = {$month: '$dateTime'};
      dateFormat = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      break;
  }

  const avgResult = await StrengthSession.aggregate([
    {$match: {sessionTime: {$exists: true, $ne: null}}},
    {
      $group: {
        _id: null,
        avgTime: {$avg: '$sessionTime'},
      },
    },
  ]);

  const DEFAULT_STRENGTH_MIN = 30;
  const averageStrengthTime = avgResult.length && avgResult[0].avgTime ? avgResult[0].avgTime : DEFAULT_STRENGTH_MIN;

  const DEFAULT_CARDIO_MINUTES = 20;
  const DEFAULT_STRETCH_MINUTES = 15;

  const strengthAgg = await StrengthSession.aggregate([
    {
      $addFields: {
        sessionTime: {$ifNull: ['$sessionTime', averageStrengthTime]},
      },
    },
    {
      $match: {
        dateTime: {$gte: startDate, $lte: now},
      },
    },
    {
      $group: {
        _id: groupBy,
        totalMinutes: {$sum: '$sessionTime'},
      },
    },
    {
      $sort: {_id: 1},
    },
  ]);

  const cardioAgg = await CardioSession.aggregate([
    {
      $match: {
        dateTime: {$gte: startDate, $lte: now},
      },
    },
    {
      $group: {
        _id: groupBy,
        count: {$sum: 1},
      },
    },
    {
      $sort: {_id: 1},
    },
  ]);

  const stretchAgg = await StretchSession.aggregate([
    {
      $match: {
        dateTime: {$gte: startDate, $lte: now},
      },
    },
    {
      $group: {
        _id: groupBy,
        count: {$sum: 1},
      },
    },
    {
      $sort: {_id: 1},
    },
  ]);

  const strengthMap = new Map();
  for (const doc of strengthAgg) {
    strengthMap.set(doc._id, doc.totalMinutes);
  }

  const cardioMap = new Map();
  for (const doc of cardioAgg) {
    cardioMap.set(doc._id, doc.count);
  }

  const stretchMap = new Map();
  for (const doc of stretchAgg) {
    stretchMap.set(doc._id, doc.count);
  }

  const formattedSummary = dateFormat.map((label, idx) => {
    let groupKey;
    if (interval === 'weekly' || interval === 'yearly') {
      groupKey = idx + 1;
    } else {
      groupKey = label;
    }

    const strengthMinutes = strengthMap.get(groupKey) || 0;

    const cardioCount = cardioMap.get(groupKey) || 0;
    const cardioMinutes = cardioCount * DEFAULT_CARDIO_MINUTES;

    const stretchCount = stretchMap.get(groupKey) || 0;
    const stretchMinutes = stretchCount * DEFAULT_STRETCH_MINUTES;

    const totalMinutes = strengthMinutes + cardioMinutes + stretchMinutes;

    const totalHours = Math.round(totalMinutes / 60);

    return {
      label,
      totalHours,
    };
  });

  res.status(200).json({
    status: true,
    data: {
      interval,
      summary: formattedSummary,
    },
    message: 'Session time analytics (rough estimate) retrieved successfully.',
  });
});

const getExerciseDistribution = catchAsync(async (req, res) => {
  const currentDate = new Date();
  const startDate = new Date(currentDate.setDate(currentDate.getDate() - 30));

  const strengthCount = await StrengthSession.countDocuments({
    dateTime: {$gte: startDate},
  });

  const cardioCount = await CardioSession.countDocuments({
    dateTime: {$gte: startDate},
  });
  const stretchCount = await StretchSession.countDocuments({
    dateTime: {$gte: startDate},
  });

  const totalSessions = strengthCount + cardioCount + stretchCount;
  const distribution = {
    strength: totalSessions ? +((strengthCount / totalSessions) * 100).toFixed(2) : 0,
    cardio: totalSessions ? +((cardioCount / totalSessions) * 100).toFixed(2) : 0,
    stretch: totalSessions ? +((stretchCount / totalSessions) * 100).toFixed(2) : 0,
  };

  res.status(200).json({
    status: true,
    data: distribution,
    message: 'Exercise distribution across all users retrieved successfully.',
  });
});

const getUserAnalytics = catchAsync(async (req, res) => {
  const now = new Date();
  const activeUserIds = new Set();

  const [strengthUsers, cardioUsers, stretchUsers] = await Promise.all([
    StrengthSession.distinct('userId'),
    CardioSession.distinct('userId'),
    StretchSession.distinct('userId'),
  ]);

  [...strengthUsers, ...cardioUsers, ...stretchUsers].map(id => id.toString()).forEach(id => activeUserIds.add(id));

  const activeUsers = activeUserIds.size;

  const totalUsers = await User.countDocuments({});
  const engagementRate = totalUsers ? ((activeUsers / totalUsers) * 100).toFixed(2) + '%' : '0%';

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime());
  endOfDay.setDate(startOfDay.getDate() + 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  let usdRatesMap = null;
  try {
    const fxResponse = await axios.get('https://open.er-api.com/v6/latest/USD');
    usdRatesMap = fxResponse.data.rates || {};
  } catch (err) {
    console.error('Failed to fetch USD→AllRates:', err.message);
    usdRatesMap = {};
  }

  async function sumBetween(startDate, endDate) {
    const subs = await Subscription.find({
      createdAt: {$gte: startDate, $lt: endDate},
    }).select('amount currency');

    let totalUsd = 0;

    for (const sub of subs) {
      const {amount, currency} = sub;

      if (currency === 'USD') {
        totalUsd += amount;
      } else {
        const rate = usdRatesMap[currency];
        if (rate) {
          totalUsd += amount / rate;
        } else {
          console.warn(`No FX rate for currency "${currency}". Skipping that subscription.`);
        }
      }
    }
    return Math.round(totalUsd * 100) / 100;
  }

  const [todaySales, monthSales, annualSales] = await Promise.all([
    sumBetween(startOfDay, endOfDay),
    sumBetween(startOfMonth, endOfMonth),
    sumBetween(startOfYear, endOfYear),
  ]);

  res.status(200).json({
    status: true,
    data: {
      totalUsers,
      activeUsers,
      engagementRate,
      todaySales,
      monthSales,
      annualSales,
    },
    message: 'Overall user analytics (all subscription‐revenues normalized to USD)',
  });
});

const getHabitAnalytics = catchAsync(async (req, res) => {
  const totalActiveHabits = await UserHabit.countDocuments();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const totalAbandonedHabits = await UserHabit.aggregate([
    {
      $lookup: {
        from: 'userhabitlogs',
        localField: '_id',
        foreignField: 'userHabitId',
        as: 'logs',
      },
    },
    {
      $match: {
        'logs.dateTime': {$not: {$gte: thirtyDaysAgo}},
      },
    },
    {$count: 'count'},
  ]);

  const abandonedHabitsCount = totalAbandonedHabits[0]?.count || 0;

  const mostPopularHabit = await UserHabit.aggregate([
    {
      $group: {
        _id: '$habitId',
        userCount: {$sum: 1},
      },
    },
    {
      $sort: {userCount: -1},
    },
    {$limit: 1},
  ]);

  const mostPopularHabitName = mostPopularHabit.length ? (await Habit.findById(mostPopularHabit[0]._id)).name : null;

  const completionRates = await UserHabitLog.aggregate([
    {
      $group: {
        _id: '$userHabitId',
        totalLogs: {$sum: 1},
        completedLogs: {
          $sum: {$cond: [{$eq: ['$status', 'completed']}, 1, 0]},
        },
      },
    },
    {
      $project: {
        completionRate: {
          $cond: [{$gt: ['$totalLogs', 0]}, {$multiply: [{$divide: ['$completedLogs', '$totalLogs']}, 100]}, 0],
        },
      },
    },
  ]);

  const avgCompletionRate =
    completionRates.reduce((sum, rate) => sum + rate.completionRate, 0) / (completionRates.length || 1);

  res.json({
    status: true,
    data: {
      totalActiveHabits,
      totalAbandonedHabits: abandonedHabitsCount,
      mostPopularHabit: mostPopularHabitName,
      avgCompletionRate: avgCompletionRate.toFixed(2) + '%',
    },
    message: 'Habit analytics retrieved successfully.',
  });
});

const getSubscriptionStats = catchAsync(async (req, res) => {
  const now = new Date();

  let usdRatesMap = {};
  try {
    const fxResponse = await axios.get('https://open.er-api.com/v6/latest/USD');
    usdRatesMap = fxResponse.data.rates || {};
  } catch (err) {
    console.error('Failed to fetch FX rates:', err.message);
    usdRatesMap = {};
  }

  const activeSubs = await Subscription.find({status: 'ACTIVE'}).select('amount currency productId');

  let monthlyRevenueUsd = 0;
  let annualRevenueUsd = 0;

  for (const sub of activeSubs) {
    const {amount, currency, productId} = sub;
    let amountInUsd = 0;

    if (currency === 'USD') {
      amountInUsd = amount;
    } else {
      const rate = usdRatesMap[currency];
      if (rate) {
        amountInUsd = amount / rate;
      } else {
        console.warn(`Unknown currency "${currency}" on subscription. Skipping.`);
        continue;
      }
    }

    amountInUsd = Math.round(amountInUsd * 100) / 100;
    if (productId === 'bamttclub_monthly_plan') {
      monthlyRevenueUsd += amountInUsd;
    } else if (productId === 'bamttclub_annual_plan') {
      annualRevenueUsd += amountInUsd;
    }
  }

  const [monthlyUsers, annualUsers] = await Promise.all([
    Subscription.countDocuments({
      productId: 'bamttclub_monthly_plan',
      status: 'ACTIVE',
    }),
    Subscription.countDocuments({
      productId: 'bamttclub_annual_plan',
      status: 'ACTIVE',
    }),
  ]);

  const freeTrialUsers = await Subscription.countDocuments({
    status: 'FREE_TRIAL',
    endDate: {$gt: now},
  });

  const [totalMonthly, totalAnnual] = await Promise.all([
    Subscription.countDocuments({productId: 'bamttclub_monthly_plan'}),
    Subscription.countDocuments({productId: 'bamttclub_annual_plan'}),
  ]);

  const revenueByPlan = {
    monthly: Math.round(monthlyRevenueUsd * 100) / 100,
    annual: Math.round(annualRevenueUsd * 100) / 100,
    totalMonthlySubs: totalMonthly,
    totalAnnualSubs: totalAnnual,
  };

  res.status(200).json({
    status: true,
    message: 'Subscription stats fetched successfully (all revenue in USD)',
    data: {
      revenueByPlan,
      monthlyUsers,
      annualUsers,
      freeTrialUsers,
    },
  });
});

const getAllUserSubscriptions = catchAsync(async (req, res) => {
  const {search, status, productId} = req.query;
  const {filters, options} = getPaginateConfig(req.query);
  options.populate = 'user::*';
  options.project = {
    purchaseToken: 0,
  };
  if (status) {
    filters.status = status;
  }

  if (productId) {
    filters.productId = productId;
  }

  if (search) {
    filters.postPopulateFilters = {
      $or: [{'user.name': {$regex: search, $options: 'i'}}, {'user.email': {$regex: search, $options: 'i'}}],
    };
  }

  const subscriptions = await Subscription.paginate(filters, options);

  res.status(200).json({
    status: true,
    message: 'User subscription details retrieved successfully',
    data: subscriptions,
  });
});

module.exports = {
  getAgeGenderDistribution,
  getSignupSummary,
  getTimeAnalytics,
  getExerciseDistribution,
  getUserAnalytics,
  getHabitAnalytics,
  getSubscriptionStats,
  getAllUserSubscriptions,
};
