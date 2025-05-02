const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const {User, StrengthSession, CardioSession, StretchSession, Habit, UserHabit} = require('../models');
const {UserHabitLog} = require('../models/userHabitLog.model');
const Subscription = require('../models/subscription.model');
const {getPaginateConfig} = require('../utils/queryPHandler');

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
    throw new ApiError(400, "Invalid interval specified. Use 'weekly', 'monthly', or 'yearly'.");
  }

  const currentDate = new Date();
  let startDate, groupBy, dateFormat;

  switch (interval) {
    case 'weekly':
      startDate = new Date(currentDate.setDate(currentDate.getDate() - 7));
      groupBy = {$dayOfWeek: '$dateTime'};
      dateFormat = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      break;

    case 'monthly':
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
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
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      groupBy = {$month: '$dateTime'};
      dateFormat = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      break;
  }

  const strengthTime = await StrengthSession.aggregate([
    {
      $match: {
        dateTime: {$gte: startDate},
      },
    },
    {
      $group: {
        _id: groupBy,
        totalTime: {$sum: '$sessionTime'},
      },
    },
    {
      $sort: {_id: 1},
    },
  ]);

  const formattedSummary = dateFormat.map((label, index) => {
    let strengthData;

    if (interval === 'weekly' || interval === 'yearly') {
      strengthData = strengthTime.find(item => item._id === index + 1);
    } else {
      strengthData = strengthTime.find(item => item._id === label);
    }

    return {
      label,
      totalHours: +((strengthData?.totalTime || 0) / 60).toFixed(0),
    };
  });

  res.status(200).json({
    status: true,
    data: {
      interval,
      summary: formattedSummary,
    },
    message: 'Session time analytics retrieved successfully.',
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
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(startOfDay.getDate() + 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const sumBetween = async (startDate, endDate) => {
    const agg = await Subscription.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {$sum: '$amount'},
        },
      },
    ]);
    return agg.length ? agg[0].total : 0;
  };

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
    message: 'Overall user analytics',
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

  const revenueAgg = await Subscription.aggregate([
    {$match: {status: 'ACTIVE'}},
    {
      $group: {
        _id: '$productId',
        total: {$sum: '$amount'},
      },
    },
  ]);

  const revenueByPlan = {
    monthly: 0,
    annual: 0,
    totalMonthlySubs: 0,
    totalAnnualSubs: 0,
  };

  for (const {_id, total} of revenueAgg) {
    if (_id === 'bamttclub_monthly_plan') revenueByPlan.monthly = total;
    if (_id === 'bamttclub_annual_plan') revenueByPlan.annual = total;
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

  revenueByPlan.totalMonthlySubs = totalMonthly;
  revenueByPlan.totalAnnualSubs = totalAnnual;
  const data = {
    revenueByPlan,
    monthlyUsers,
    annualUsers,
    freeTrialUsers,
  };

  res.status(200).json({
    status: true,
    message: 'Subscription stats fetched successfully',
    data,
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
