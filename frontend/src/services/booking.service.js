import api from './api';

const bookingService = {
  getMyBookings: () =>
    api.get('/bookings/my-tickets'),

  getMyPendingLocks: (eventId) =>
    api.get('/bookings/pending', { params: { eventId } }),

  // Lock a single seat — returns { bookingId, seatId, seatLabel, zoneName, totalPrice, status, expiresAt }
  lockSeat: (seatId, socketId) =>
    api.post('/bookings/lock', { seatId, socketId }),

  releaseSeat: (bookingId) =>
    api.delete(`/bookings/${bookingId}/release`),

  // Confirm payment for one or more pending bookings
  checkout: (bookingIds) =>
    api.post('/bookings/checkout', { bookingIds }),

  verifyQR: (qrCode) =>
    api.post('/bookings/verify-qr', { qrCode }),
};

export default bookingService;
