const express = require('express');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const eventRoutes = require('./routes/event.routes');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);

module.exports = app;
