const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

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
// Device auth middleware applied to all protected routes
const { deviceAuth } = require('./middleware/device');
app.use('/api/users', deviceAuth, require('./routes/users'));
app.use('/api/breaks', deviceAuth, require('./routes/breaks'));
app.use('/api/settings', deviceAuth, require('./routes/settings'));
app.use('/api/devices', deviceAuth, require('./routes/devices'));

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
