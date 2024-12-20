const mongoose = require('mongoose');
const {Schema} = mongoose;
const bcrypt = require("bcrypt")

// Define the base schema with common fields
const adminBaseSchema = new Schema(
    {
      name: {
        type: String,
        required: false
      },
      email: { 
        type: String, 
        required: true, 
      },
      phone: { 
        type: String 
      }, // Optional
      password: { 
        type: String, 
        required: true 
      }
    },
    { timestamps: true }
  );
// Pre-save hook to hash the password before saving
adminBaseSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });
  
  // Method to compare passwords
  adminBaseSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };
const Admin = mongoose.model('Admin', adminBaseSchema);

module.exports = {
    Admin
}
