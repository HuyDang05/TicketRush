import api from './api';

const bookingService = {
  getMyBookings: () =>
    api.get('/bookings/my-tickets'),

  getMyPendingLocks: (eventId) =>
    api.get('/bookings/pending', { params: { eventId } }),

  // Lock a single seat — returns { bookingId, seatId, seatLabel, zoneName, totalPrice, status, expiresAt }
  lockSeat: (seatId, socketId, queueToken, queueSessionId) => {
    const payload = { seatId, queueToken, queueSessionId };
    if (socketId) payload.socketId = socketId;
    return api.post('/bookings/lock', payload);
  },

  releaseSeat: (bookingId) =>
    api.delete(`/bookings/${bookingId}/release`),

  // Confirm payment for one or more pending bookings
  checkout: (bookingIds) =>
    api.post('/bookings/checkout', { bookingIds }),

  verifyQR: (qrCode) =>
    api.post('/bookings/verify-qr', { qrCode }),
};

export default bookingService;
