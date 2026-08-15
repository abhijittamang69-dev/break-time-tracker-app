const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
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
// @desc    Get all devices (admin only)
// @access  Private (Admin only)
router.get('/all', auth, isAdmin, async (req, res) => {
  try {
    const devices = await Device.find()
      .populate('userId', 'name username role')
      .sort({ lastUsed: -1 });
    res.json(devices);
  } catch (error) {
    console.error('Get all devices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/register
// @desc    Register a new device
// @access  Private
router.post('/register', auth, async (req, res) => {
  try {
    const { deviceToken, deviceName, userAgent } = req.body;

    if (!deviceToken) {
      return res.status(400).json({ message: 'Device token is required' });
    }

    // Check if device already exists
    let device = await Device.findOne({ deviceToken });
    if (device) {
      // Update existing device
      device.userId = req.user._id;
      device.deviceName = deviceName || device.deviceName;
      device.userAgent = userAgent || device.userAgent;
      device.lastUsed = new Date();
      device.isActive = true;
      await device.save();
      return res.json({ message: 'Device registered successfully', device });
    }

    // Create new device
    device = new Device({
      userId: req.user._id,
      deviceToken,
      deviceName: deviceName || 'Unknown Device',
      userAgent: userAgent || req.headers['user-agent'] || '',
      lastUsed: new Date(),
      isActive: true
    });

    await device.save();
    res.status(201).json({ message: 'Device registered successfully', device });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/devices/deactivate/:id
// @desc    Deactivate a device (admin only)
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
// @desc    Activate a device (admin only)
// @access  Private (Admin only)
router.post('/activate/:id', auth, isAdmin, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.isActive = true;
    await device.save();
    res.json({ message: 'Device activated successfully' });
  } catch (error) {
    console.error('Activate device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
