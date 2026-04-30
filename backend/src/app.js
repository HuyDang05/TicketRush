const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const adminDashboardRoutes = require('./routes/admin-dashboard.routes');

require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const eventRoutes = require('./routes/event.routes');

const bookingRoutes = require('./routes/booking.routes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

module.exports = app;