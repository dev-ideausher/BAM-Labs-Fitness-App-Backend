const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const ApiError = require('../utils/ApiError');
const {jwtSecret} = require('../config/config');

// Generate JWT Token
const generateToken = ({email, _id}) => {
  return jwt.sign({ _id, email }, jwtSecret, {
    expiresIn: '7d', // Token expires in 7 days
  });
};

// Register a new admin
const registerAdmin = async ({name, email, password, phone}) => {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new ApiError(400, "Admin already exists with this email");
    }
    const adminCount = await Admin.countDocuments();
    if (adminCount >= 1 ) {
      throw new ApiError(400, "only one admin can be created");
    }

    // Create a new admin
    const newAdmin = new Admin({ name, email, phone, password });
    await newAdmin.save();

    return {name, email}
};

// Login an admin
const loginAdmin = async ({email, password}) => {
    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new ApiError(401, "Invalid email");
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid password");
    }

    // Generate token
    const token = generateToken({email:admin.email,_id:admin._id});
    return {email:admin.email,_id:admin._id, token}
};

module.exports = {
  registerAdmin,
  loginAdmin,
};
