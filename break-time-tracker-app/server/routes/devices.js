const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');

// @route   GET /api/devices
// @desc    Get all devices (for current user)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.user._id })
      .sort({ lastUsed: -1 });
    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/devices/all
// @desc    Get all devices with status (admin only) - filters out legacy devices
// @access  Private (Admin only)
router.get('/all', auth, isAdmin, async (req, res) => {
  try {
    // Only return devices that have the new status field (hides legacy/old data)
    const devices = await Device.find({ status: { $exists: true } })
      .populate('userId', 'name username role')
      .sort({ createdAt: -1 });
    res.json(devices);
  } catch (error) {
    console.error('Get all devices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/cleanup
// @desc    Delete all legacy devices (without status) and non-admin approved devices - admin only
// @access  Private (Admin only)
router.post('/cleanup', auth, isAdmin, async (req, res) => {
  try {
    // Delete all devices without status (legacy old data)
    const legacyResult = await Device.deleteMany({ status: { $exists: false } });
    // Also delete all approved devices for non-admin users (fresh start)
    const nonAdminUsers = await User.find({ role: { $ne: 'Admin' } }).select('_id');
    const nonAdminIds = nonAdminUsers.map(u => u._id.toString());
    const approvedResult = await Device.deleteMany({
      userId: { $in: nonAdminIds },
      status: { $in: ['approved', 'pending', 'rejected'] }
    });
    res.json({
      message: 'Cleanup completed',
      legacyDeleted: legacyResult.deletedCount,
      userDevicesDeleted: approvedResult.deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/register
// @desc    Register a new device (one per non-admin user)
// @access  Private
router.post('/register', auth, async (req, res) => {
  try {
    const { deviceToken, deviceName, userAgent } = req.body;

    if (!deviceToken) {
      return res.status(400).json({ message: 'Device token is required' });
    }

    const currentUser = await User.findById(req.user._id);
    const isAdminUser = currentUser && currentUser.role === 'Admin';

    // For non-admin users: keep only one device. Delete old ones before creating new.
    if (!isAdminUser) {
      await Device.deleteMany({ userId: req.user._id });
    }

    // Check if device already exists
    let device = await Device.findOne({ deviceToken });
    if (device) {
      // Update existing device
      device.userId = req.user._id;
      device.deviceName = deviceName || device.deviceName;
      device.userAgent = userAgent || device.userAgent;
      device.lastUsed = new Date();
      await device.save();
      return res.json({ message: 'Device registered successfully', device });
    }

    // Create new device as pending
    device = new Device({
      userId: req.user._id,
      deviceToken,
      deviceName: deviceName || 'Unknown Device',
      userAgent: userAgent || req.headers['user-agent'] || '',
      lastUsed: new Date(),
      status: 'pending',
      isActive: false
    });

    await device.save();
    res.status(201).json({ message: 'Device registered successfully', device });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/approve/:id
// @desc    Approve a pending device (admin only)
// @access  Private (Admin only)
router.post('/approve/:id', auth, isAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Deactivate all other approved devices for this user (one device per user)
    // Skip for admin users - they can have multiple active devices
    const deviceOwner = await User.findById(device.userId);
    if (deviceOwner && deviceOwner.role !== 'Admin') {
      await Device.updateMany(
        { userId: device.userId, _id: { $ne: device._id }, status: 'approved' },
        { $set: { isActive: false } }
      );
    }

    device.status = 'approved';
    device.isActive = true;
    await device.save();
    res.json({ message: 'Device approved successfully' });
  } catch (error) {
    console.error('Approve device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/reject/:id
// @desc    Reject a pending device (admin only)
// @access  Private (Admin only)
router.post('/reject/:id', auth, isAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.status = 'rejected';
    device.isActive = false;
    await device.save();
    res.json({ message: 'Device rejected successfully' });
  } catch (error) {
    console.error('Reject device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/deactivate/:id
// @desc    Deactivate an approved device (admin only)
// @access  Private (Admin only)
router.post('/deactivate/:id', auth, isAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.isActive = false;
    await device.save();
    res.json({ message: 'Device deactivated successfully' });
  } catch (error) {
    console.error('Deactivate device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/activate/:id
// @desc    Reactivate a deactivated device (admin only)
// @access  Private (Admin only)
router.post('/activate/:id', auth, isAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (device.status === 'rejected') {
      device.status = 'approved';
    }
    device.isActive = true;
    await device.save();
    res.json({ message: 'Device activated successfully' });
  } catch (error) {
    console.error('Activate device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/devices/:id
// @desc    Permanently delete a device (admin only)
// @access  Private (Admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    await Device.deleteOne({ _id: req.params.id });
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
