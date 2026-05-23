// Purpose: Client API wrapper goi backend va gom cac endpoint theo domain.
import api from './api';

const bookingService = {
  getMyBookings: () =>
    api.get('/bookings/my-tickets'),

  getMyPendingLocks: (eventId) =>
    api.get('/bookings/pending', { params: { eventId } }),

  // Lock a single seat — returns session-level expiresAt shared by all seats in the event hold.
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
