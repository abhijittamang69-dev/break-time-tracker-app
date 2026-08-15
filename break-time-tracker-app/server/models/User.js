const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Coordinator', 'Supervisor', 'Team Leader', 'Operator'],
    default: 'Operator'
  },
  shift: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Night', 'Rotating'],
    default: 'Morning'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
