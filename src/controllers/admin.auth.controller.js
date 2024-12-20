const {adminAuthService} = require('../services');
const catchAsync = require('../utils/catchAsync');


const loginAdmin = catchAsync(async (req, res) => { 
  const {email, password} = req.body;
  const admin = await adminAuthService.loginAdmin({email, password});
  res.status(200).json({
    status: true,
    message: 'Login successful',
    data: admin,
  });
});

const registerAdmin = catchAsync(async (req, res) => {
  const {name, email, phone, password} = req.body;
  const admin = await adminAuthService.registerAdmin({name, email, phone, password});
  res.status(201).json({
    status: true,
    message: 'Admin registered successfully',
    data: admin,
  });
});


module.exports = {
    loginAdmin,
    registerAdmin
}