const express = require('express');
const cors = require('cors');
require('dotenv').config();

const bookingRoutes = require('./routes/booking.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3001', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.use('/api/bookings', bookingRoutes);

module.exports = app;
