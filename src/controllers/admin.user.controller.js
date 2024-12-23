const httpStatus = require("http-status");
const { userService } = require("../services");
const catchAsync = require("../utils/catchAsync");
// const ApiError = require("../utils/ApiError");
const { getPaginateConfig } = require("../utils/queryPHandler");
const ApiError = require("../utils/ApiError");



const getUsers = catchAsync(async (req, res) => {
  const {type} = req.params;;
  const { filters, options } = getPaginateConfig({});
  options.project = {_id:1, name:1, email:1, phone:1, firebaseUid:1, createdAt:1, gender:1, isEmailVerified:1, isPhoneVerified:1}

  if(!type){
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide a type')
  }
  if(type === 'overview'){
    filters.isEmailVerified = true
    filters.isPhoneVerified = true
  } else if(type === 'management'){
    filters['$or'] = [{isPhoneVerified: false}, {isEmailVerified: false}]
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid type')

  }
  console.log(filters)
  const users = await userService.getUsers(filters, options);
  res.status(httpStatus.OK).send({data: users, message: "Users fetched successfully", status:true});
});





module.exports = {
    getUsers,
}