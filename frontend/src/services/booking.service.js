import api from './api';

const bookingService = {
  getMyBookings: () =>
    api.get('/bookings/my-tickets'),

  // Lock a single seat — returns { bookingId, seatId, seatLabel, zoneName, totalPrice, status, expiresAt }
  lockSeat: (seatId) =>
    api.post('/bookings/lock', { seatId }),

  // Confirm payment for one or more pending bookings
  checkout: (bookingIds) =>
    api.post('/bookings/checkout', { bookingIds }),

  verifyQR: (qrCode) =>
    api.post('/bookings/verify-qr', { qrCode }),
};

export default bookingService;
