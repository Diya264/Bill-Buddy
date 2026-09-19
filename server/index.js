const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize database (creates tables if they don't exist)
require('./database/db');

// Import routes
const authRoutes = require('./routes/auth');
const billRoutes = require('./routes/bills');
const groupRoutes = require('./routes/groups');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const recurringRoutes = require('./routes/recurring');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: '✅ BillBuddy server is running!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});