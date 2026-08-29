const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { auth, generateToken } = require('../middleware/auth');
const { getDeviceType } = require('../utils/device');

router.post('/login', async (req, res) => {
  try {
    const { username, password, deviceToken, deviceName, userAgent } = req.body;
    const deviceType = getDeviceType(userAgent || '');

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Device is required for all users
    if (!deviceToken) {
      return res.status(403).json({
        message: 'DEVICE_REQUIRED',
        description: 'Device token is required. Please enable device registration.'
      });
    }

    const Device = require('../models/Device');
    let device = await Device.findOne({ deviceToken });
    const isAdminUser = user.role === 'Admin';

    if (device) {
      // Migrate old devices that don't have a status field yet
      if (!device.status) {
        device.status = 'approved';
        device.isActive = true;
      }
      // Admin bypass - always approve their device
      if (isAdminUser) {
        device.status = 'approved';
        device.isActive = true;
        device.userId = user._id;
        device.lastUsed = new Date();
        if (deviceName) device.deviceName = deviceName;
        if (userAgent) device.userAgent = userAgent;
        device.deviceType = deviceType;
        await device.save();
      } else {
        // Non-admin - check ownership and status
        if (device.userId && device.userId.toString() !== user._id.toString()) {
          return res.status(403).json({
            message: 'DEVICE_UNAUTHORIZED',
            description: 'Unauthorized device. Please contact your administrator.'
          });
        }
        if (device.status === 'pending') {
          return res.status(403).json({
            message: 'DEVICE_UNAUTHORIZED',
            description: 'Unauthorized device. Please contact your administrator.'
          });
        }
        if (device.status === 'rejected') {
          return res.status(403).json({
            message: 'DEVICE_UNAUTHORIZED',
            description: 'Unauthorized device. Please contact your administrator.'
          });
        }
        if (device.status === 'approved' && !device.isActive) {
          return res.status(403).json({
            message: 'DEVICE_UNAUTHORIZED',
            description: 'Unauthorized device. Please contact your administrator.'
          });
        }
        // Approved and active - update info and allow login
        device.userId = user._id;
        device.lastUsed = new Date();
        if (deviceName) device.deviceName = deviceName;
        if (userAgent) device.userAgent = userAgent;
        device.deviceType = deviceType;
        await device.save();
      }
    } else {
      // New device
      if (isAdminUser) {
        // Admin - auto-approve
        device = new Device({
          userId: user._id,
          deviceToken,
          deviceName: deviceName || 'Unknown Device',
          deviceType,
          userAgent: userAgent || '',
          lastUsed: new Date(),
          status: 'approved',
          isActive: true
        });
        await device.save();
      } else {
        // Non-admin - create as pending, block login
        device = new Device({
          userId: user._id,
          deviceToken,
          deviceName: deviceName || 'Unknown Device',
          deviceType,
          userAgent: userAgent || '',
          lastUsed: new Date(),
          status: 'pending',
          isActive: false
        });
        await device.save();
        return res.status(403).json({
          message: 'DEVICE_UNAUTHORIZED',
          description: 'Unauthorized device. Please contact your administrator.'
        });
      }
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        shift: user.shift
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /auth/reset-password
// @desc    Reset an operator's password (Approver only)
// @access  Private (Approver)
router.post('/reset-password', auth, async (req, res) => {
  try {
    if (!['Supervisor', 'Team Leader', 'Coordinator', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only approvers can reset passwords' });
    }

    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'Please provide userId and newPassword' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only allow resetting Operator passwords
    if (targetUser.role !== 'Operator') {
      return res.status(403).json({ message: 'Can only reset Operator passwords' });
    }

    const salt = await bcrypt.genSalt(10);
    targetUser.password = await bcrypt.hash(newPassword, salt);
    await targetUser.save();
    res.json({ message: `Password reset successfully for ${targetUser.name}` });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      id: req.user._id.toString(),
      username: req.user.username,
      name: req.user.name,
      role: req.user.role,
      shift: req.user.shift
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
