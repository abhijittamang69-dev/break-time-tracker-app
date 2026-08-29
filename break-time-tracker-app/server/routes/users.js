const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { isApprover } = require('../middleware/role');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (all authenticated users)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create new user (Admin or Supervisor/Team Leader/Coordinator)
// @access  Private (Admin or Approver)
router.post('/', auth, isApprover, async (req, res) => {
  try {
    const { username, password, name, role, shift } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Please provide username, password, and name' });
    }
    let user = await User.findOne({ username: username.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      role: role || 'Operator',
      shift: shift || 'Morning'
    });
    await user.save();
    const userResponse = await User.findById(user._id).select('-password');
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user details (Admin only)
// @access  Private (Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, username, role, shift } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check username uniqueness if changing
    if (username && username.toLowerCase() !== user.username) {
      const existing = await User.findOne({ username: username.toLowerCase() });
      if (existing) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      user.username = username.toLowerCase();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (shift) user.shift = shift;

    await user.save();
    const userResponse = await User.findById(user._id).select('-password');
    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin or Supervisor/Team Leader/Coordinator)
// @access  Private (Admin or Approver)
router.delete('/:id', auth, isApprover, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'Admin') {
      return res.status(403).json({ message: 'Administrator accounts cannot be deleted' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
