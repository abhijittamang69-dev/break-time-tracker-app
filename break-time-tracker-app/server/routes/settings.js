const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');

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

router.put('/', auth, isAdmin, async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    const { maxBreakMinutes, maxBreaksPerShift, lateThresholdMinutes, defaultBreakDuration, reminderMinutesBeforeEnd } = req.body;
    // NOTE: qrCodeValue and qrGeneratedAt are system-managed only.
    // They are auto-generated daily at 6:00 AM by the server cron job.
    // Admin cannot manually change them.
    if (maxBreakMinutes !== undefined) settings.maxBreakMinutes = maxBreakMinutes;
    if (maxBreaksPerShift !== undefined) settings.maxBreaksPerShift = maxBreaksPerShift;
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
