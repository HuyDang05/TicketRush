const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const adminDashboardRoutes = require('./routes/admin-dashboard.routes');

require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const eventRoutes = require('./routes/event.routes');
const userRoutes = require('./routes/user.routes');
const bookingRoutes = require('./routes/booking.routes');
const adminTicketRoutes = require('./routes/admin-ticket.routes');
const queueRoutes = require('./routes/queue.routes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
app.use('/api/users', userRoutes);
app.use('/api/admin', adminTicketRoutes);
app.use('/api/queue', queueRoutes);

module.exports = app;
