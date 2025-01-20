const {adminAuthService} = require('../services');
const catchAsync = require('../utils/catchAsync');
const { Admin } = require('../models');
const jwt = require('jsonwebtoken');
const {jwtSecret} = require('../config/config');
const { sendEmail } = require("../microservices/mail.service");
const ApiError = require('../utils/ApiError');
const { getForgotPasswordEmailTemplate } = require('../microservices/emailTemplates.service');

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

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await Admin.findOne({ email });
  if (!user) {
    throw new ApiError(404, "Admin with this email does not exist");
  }

  const token = jwt.sign({ id: user._id }, jwtSecret, {
    expiresIn: "1h",
  });

  const resetLink = `https://web-bam-labs.vercel.app/forgot-password?token=${token}`;
  const emailData = {
    to: email,
    subject: "Password Reset Request",
    html: getForgotPasswordEmailTemplate(resetLink),
  };

  await sendEmail(emailData);

  res.status(200).json({
    status: true,
    message: "Password reset link sent to your email",
  });
});


const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword, repeatPassword } = req.body;

  if (!token || !newPassword || !repeatPassword) {
    throw new ApiError(
      400,
      "Token, new password, and repeat password are required"
    );
  }

  if (newPassword !== repeatPassword) {
    throw new ApiError(400, "New password and repeat password do not match");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    throw new ApiError(400, "Invalid or expired token");
  }

  const user = await Admin.findById(decoded.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: true,
    message: "Password reset successfully",
  });
});



module.exports = {
    loginAdmin,
    registerAdmin,
    forgotPassword,
    resetPassword,
}