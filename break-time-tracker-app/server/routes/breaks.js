const express = require('express');
const router = express.Router();
const Break = require('../models/Break');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { auth } = require('../middleware/auth');
const { isApprover } = require('../middleware/role');

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  return { start, end };
};

// Break area coordinates: 25°14'28.90"N 51°28'31.51"E
const BREAK_AREA_LAT = 25 + 14/60 + 28.90/3600;
const BREAK_AREA_LNG = 51 + 28/60 + 31.51/3600;
const MAX_DISTANCE_METERS = 10;

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const validateGeolocation = (lat, lng) => {
  if (lat == null || lng == null) return { valid: false, message: 'Location required. Please enable GPS.' };
  const distance = getDistanceMeters(lat, lng, BREAK_AREA_LAT, BREAK_AREA_LNG);
  if (distance > MAX_DISTANCE_METERS) {
    return { valid: false, message: `You are ${Math.round(distance)}m away from the break area. Must be within ${MAX_DISTANCE_METERS}m.` };
  }
  return { valid: true, distance };
};

// Auto-approve pending breaks older than 45 seconds
const AUTO_APPROVE_SECONDS = 45;
const autoApprovePendingBreaks = async () => {
  try {
    const cutoff = new Date(Date.now() - AUTO_APPROVE_SECONDS * 1000);
    const stalePending = await Break.find({
      status: 'pending',
      requestedAt: { $lte: cutoff }
    });

    for (const breakRecord of stalePending) {
      breakRecord.status = 'active';
      breakRecord.startTime = new Date();
      breakRecord.approvedBy = null;
      breakRecord.approvedByName = 'Auto-Approved';
      breakRecord.approvedAt = new Date();
      breakRecord.approvedDuration = 15;
      await breakRecord.save();
    }

    return stalePending.length;
  } catch (error) {
    console.error('Auto-approve error:', error);
    return 0;
  }
};

router.get('/', auth, async (req, res) => {
  try {
    const { userId, date, status, limit = 200 } = req.query;
    const query = {};
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      query.date = {
        $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        $lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      };
    }
    const breaks = await Break.find(query).sort({ requestedAt: -1 }).limit(parseInt(limit));
    res.json(breaks);
  } catch (error) {
    console.error('Get breaks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/today', auth, async (req, res) => {
  try {
    await autoApprovePendingBreaks();
    const { start, end } = getTodayRange();
    const breaks = await Break.find({ date: { $gte: start, $lt: end } }).sort({ requestedAt: -1 });
    res.json(breaks);
  } catch (error) {
    console.error('Get today breaks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const breaks = await Break.find({ userId: req.user._id }).sort({ requestedAt: -1 }).limit(100);
    res.json(breaks);
  } catch (error) {
    console.error('Get my breaks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    await autoApprovePendingBreaks();
    const { start, end } = getTodayRange();
    const pending = await Break.find({
      date: { $gte: start, $lt: end },
      status: 'pending'
    }).sort({ requestedAt: 1 });
    res.json(pending);
  } catch (error) {
    console.error('Get pending breaks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/request', auth, async (req, res) => {
  try {
    const { breakNumber, requestedDuration, mode, latitude, longitude } = req.body;
    const userId = req.user._id;
    const { start, end } = getTodayRange();

    if (mode === 'qr') {
      const geo = validateGeolocation(latitude, longitude);
      if (!geo.valid) {
        return res.status(403).json({ message: geo.message });
      }
    }

    const existingBreak = await Break.findOne({
      userId: userId,
      status: { $in: ['pending', 'active'] },
      date: { $gte: start, $lt: end }
    });

    if (existingBreak) {
      return res.status(400).json({
        message: existingBreak.status === 'pending'
          ? 'You already have a pending break request'
          : 'You are already on a break'
      });
    }

    const allTodayBreaks = await Break.find({
      userId: userId,
      date: { $gte: start, $lt: end }
    });

    if (allTodayBreaks.length > 0) {
      const existingMode = allTodayBreaks[0].mode;
      if (mode && mode !== existingMode) {
        const modeLabel = existingMode === 'qr' ? 'QR Code' : 'Manual';
        return res.status(400).json({
          message: `You are already using ${modeLabel} mode this shift. You can only use one option per shift.`
        });
      }
    }

    const isQr = mode === 'qr';
    const maxBreaks = isQr ? 4 : 3;
    const defaultDuration = 15;
    const maxTotalMinutes = isQr ? 60 : 45;

    const todayBreaks = await Break.find({
      userId: userId,
      date: { $gte: start, $lt: end },
      status: { $in: ['active', 'completed', 'late'] }
    });

    if (todayBreaks.length >= maxBreaks) {
      return res.status(400).json({ message: `Maximum ${maxBreaks} breaks reached for this shift` });
    }

    const totalUsed = todayBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    if (totalUsed >= maxTotalMinutes * 60) {
      return res.status(400).json({ message: 'No break time remaining for this shift' });
    }

    const now = new Date();
    const newBreak = new Break({
      userId: userId,
      userName: req.user.name,
      userRole: req.user.role,
      shift: req.user.shift || 'Morning',
      breakNumber: breakNumber || (todayBreaks.length + 1),
      date: now,
      status: 'pending',
      requestedAt: now,
      approvedDuration: requestedDuration || defaultDuration,
      mode: mode || 'manual',
      latitude: latitude || null,
      longitude: longitude || null
    });

    await newBreak.save();
    res.status(201).json(newBreak);
  } catch (error) {
    console.error('Request break error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/approve/:id', auth, isApprover, async (req, res) => {
  try {
    const breakRecord = await Break.findById(req.params.id);

    if (!breakRecord) {
      return res.status(404).json({ message: 'Break request not found' });
    }
    if (breakRecord.status !== 'pending') {
      return res.status(400).json({ message: 'Break request is not pending' });
    }

    if (breakRecord.userId.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot approve your own break request' });
    }

    const fixedDuration = 15;

    breakRecord.status = 'active';
    breakRecord.startTime = new Date();
    breakRecord.approvedBy = req.user._id;
    breakRecord.approvedByName = req.user.name;
    breakRecord.approvedAt = new Date();
    breakRecord.approvedDuration = fixedDuration;

    await breakRecord.save();
    res.json(breakRecord);
  } catch (error) {
    console.error('Approve break error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reject/:id', auth, isApprover, async (req, res) => {
  try {
    const breakRecord = await Break.findById(req.params.id);
    if (!breakRecord) return res.status(404).json({ message: 'Break request not found' });
    if (breakRecord.status !== 'pending') return res.status(400).json({ message: 'Break request is not pending' });

    breakRecord.status = 'rejected';
    breakRecord.approvedBy = req.user._id;
    breakRecord.approvedByName = req.user.name;
    breakRecord.approvedAt = new Date();
    await breakRecord.save();
    res.json(breakRecord);
  } catch (error) {
    console.error('Reject break error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/end/:id', auth, async (req, res) => {
  try {
    const breakRecord = await Break.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'active'
    });

    if (!breakRecord) {
      return res.status(404).json({ message: 'Active break not found' });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - breakRecord.startTime.getTime()) / 1000);

    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    const isLate = duration > (settings.lateThresholdMinutes * 60);

    breakRecord.endTime = endTime;
    breakRecord.duration = duration;
    breakRecord.status = isLate ? 'late' : 'completed';

    await breakRecord.save();
    res.json(breakRecord);
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reports', auth, async (req, res) => {
  try {
    const { start, end } = getTodayRange();
    const todayBreaks = await Break.find({ date: { $gte: start, $lt: end } });

    const completed = todayBreaks.filter(b => b.status === 'completed' || b.status === 'late');
    const active = todayBreaks.filter(b => b.status === 'active');
    const pending = todayBreaks.filter(b => b.status === 'pending');

    const totalDuration = completed.reduce((sum, b) => sum + (b.duration || 0), 0);
    const avgDuration = completed.length > 0 ? Math.floor(totalDuration / completed.length) : 0;
    const lateReturns = completed.filter(b => b.status === 'late').length;

    const users = await User.find().select('-password');
    const staffStats = users.map(user => {
      const userBreaks = todayBreaks.filter(b => b.userId.toString() === user._id.toString());
      const userCompleted = userBreaks.filter(b => b.status === 'completed' || b.status === 'late');
      return {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
        shift: user.shift,
        breaksTaken: userCompleted.length,
        totalTime: userCompleted.reduce((sum, b) => sum + (b.duration || 0), 0),
        onBreak: userBreaks.some(b => b.status === 'active'),
        pending: userBreaks.some(b => b.status === 'pending'),
        isLate: userCompleted.some(b => b.status === 'late')
      };
    });

    res.json({
      totalBreaks: completed.length,
      avgDuration,
      totalDuration,
      lateReturns,
      activeBreaks: active.length,
      pendingRequests: pending.length,
      staffStats,
      allBreaks: todayBreaks
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
