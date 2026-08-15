const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    const { maxBreakMinutes, maxBreaksPerShift, qrCodeValue, lateThresholdMinutes, defaultBreakDuration, reminderMinutesBeforeEnd } = req.body;
    if (maxBreakMinutes !== undefined) settings.maxBreakMinutes = maxBreakMinutes;
    if (maxBreaksPerShift !== undefined) settings.maxBreaksPerShift = maxBreaksPerShift;
    if (qrCodeValue !== undefined) settings.qrCodeValue = qrCodeValue;
    if (lateThresholdMinutes !== undefined) settings.lateThresholdMinutes = lateThresholdMinutes;
    if (defaultBreakDuration !== undefined) settings.defaultBreakDuration = defaultBreakDuration;
    if (reminderMinutesBeforeEnd !== undefined) settings.reminderMinutesBeforeEnd = reminderMinutesBeforeEnd;
    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
