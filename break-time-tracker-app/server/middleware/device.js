const Device = require('../models/Device');

const deviceAuth = async (req, res, next) => {
  try {
    // Skip device check for login and health endpoints
    if (req.path === '/login' || req.path === '/health') {
      return next();
    }

    const deviceToken = req.header('X-Device-Token');

    if (!deviceToken) {
      return res.status(403).json({ 
        message: 'DEVICE_NOT_REGISTERED',
        description: 'This device is not registered. Please login from a registered device or contact your supervisor.'
      });
    }

    // Check if device exists and is active
    const device = await Device.findOne({
      userId: req.user._id,
      deviceToken: deviceToken,
      isActive: true
    });

    if (!device) {
      return res.status(403).json({ 
        message: 'DEVICE_NOT_REGISTERED',
        description: 'This device is not registered or has been deactivated. Please contact your supervisor.'
      });
    }

    // Update last used time
    device.lastUsed = new Date();
    await device.save();

    req.device = device;
    next();
  } catch (error) {
    console.error('Device auth error:', error);
    res.status(500).json({ message: 'Device verification failed' });
  }
};

module.exports = { deviceAuth };
