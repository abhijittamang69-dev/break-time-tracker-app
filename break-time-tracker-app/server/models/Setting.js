const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  maxBreakMinutes: {
    type: Number,
    default: 60,
    min: 1,
    max: 480
  },
  maxBreaksPerShift: {
    type: Number,
    default: 3,
    min: 1,
    max: 20
  },
  qrCodeValue: {
    type: String,
    default: 'BREAK_TIME_QR_2024'
  },
  qrGeneratedAt: {
    type: Date,
    default: null
  },
    type: String,
    default: 'BREAK_TIME_QR_2024'
  },
  lateThresholdMinutes: {
    type: Number,
    default: 30,
    min: 1,
    max: 240
  },
  defaultBreakDuration: {
    type: Number,
    default: 15,
    min: 1,
    max: 120
  },
  reminderMinutesBeforeEnd: {
    type: Number,
    default: 5,
    min: 1,
    max: 30
  }
});

module.exports = mongoose.model('Setting', settingSchema);
