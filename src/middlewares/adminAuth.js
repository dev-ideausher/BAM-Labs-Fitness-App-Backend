const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');


const authenticate = catchAsync(async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log(token)
    if (!token) {
      throw new ApiError(401, 'No token provided');
    }
  
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      next();
    } catch (err) {
        console.log(err)
      throw new ApiError(401, 'Invalid or expired token');
    }
  });

  module.exports = {
    authenticate,
  };