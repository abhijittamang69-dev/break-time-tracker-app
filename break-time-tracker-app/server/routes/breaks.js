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
    const { breakNumber, requestedDuration, mode } = req.body;
    const userId = req.user._id;
    const { start, end } = getTodayRange();

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

    // Check if user already has breaks today and enforce same mode
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

    // Mode-specific limits
    const isQr = mode === 'qr';
    const maxBreaks = isQr ? 4 : 3;
    const defaultDuration = isQr ? 60 : 45;
    const maxTotalMinutes = isQr ? 240 : 135; // 4 x 60 or 3 x 45

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
      mode: mode || 'manual'
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
    const { approvedDuration } = req.body;
    const breakRecord = await Break.findById(req.params.id);

    if (!breakRecord) {
      return res.status(404).json({ message: 'Break request not found' });
    }
    if (breakRecord.status !== 'pending') {
      return res.status(400).json({ message: 'Break request is not pending' });
    }

    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});

    const duration = approvedDuration || breakRecord.approvedDuration || settings.defaultBreakDuration;

    breakRecord.status = 'active';
    breakRecord.startTime = new Date();
    breakRecord.approvedBy = req.user._id;
    breakRecord.approvedByName = req.user.name;
    breakRecord.approvedAt = new Date();
    breakRecord.approvedDuration = duration;

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
