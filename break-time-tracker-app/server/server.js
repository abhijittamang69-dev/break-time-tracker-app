const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const connectDB = require('./config/db');
const User = require('./models/User');
const Setting = require('./models/Setting');
const Device = require('./models/Device');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));

// Protected routes: auth first, then device auth
const { auth } = require('./middleware/auth');
const { deviceAuth } = require('./middleware/device');
app.use('/api/users', auth, deviceAuth, require('./routes/users'));
app.use('/api/breaks', auth, deviceAuth, require('./routes/breaks'));
app.use('/api/settings', auth, deviceAuth, require('./routes/settings'));
app.use('/api/devices', auth, deviceAuth, require('./routes/devices'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const seedData = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123', salt);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'Admin',
        shift: 'Morning'
      });
      console.log('Default admin user created (admin / Admin123)');
    }
    const settingsExist = await Setting.findOne();
    if (!settingsExist) {
      await Setting.create({});
      console.log('Default settings created');
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
};

// Generate a new random QR code value
const generateQRValue = () => 'BREAK_QR_' + Math.random().toString(36).substring(2, 10).toUpperCase();

// Check if two dates are the same calendar day
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
};

// Auto-generate QR code daily at 6:00 AM
const autoGenerateQR = async () => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    const today = new Date();
    // Only generate if not already generated today
    if (!isSameDay(today, settings.qrGeneratedAt)) {
      settings.qrCodeValue = generateQRValue();
      settings.qrGeneratedAt = today;
      await settings.save();
      console.log(`[QR Auto-Gen] New QR code generated at ${today.toISOString()}: ${settings.qrCodeValue}`);
    } else {
      console.log(`[QR Auto-Gen] QR already generated today at ${settings.qrGeneratedAt}. Skipping.`);
    }
  } catch (error) {
    console.error('[QR Auto-Gen] Error generating QR code:', error);
  }
};

// Schedule QR generation every day at 6:00 AM server time
cron.schedule('0 6 * * *', () => {
  console.log('[Cron] Running 6:00 AM QR auto-generation...');
  autoGenerateQR();
}, {
  scheduled: true,
  timezone: 'Asia/Qatar' // Adjust to your local timezone if needed
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedData();

    // Also run QR generation check on startup (in case server was down at 6 AM)
    await autoGenerateQR();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
