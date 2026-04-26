import api from './api';

const bookingService = {
  getMyBookings: () =>
    api.get('/bookings/my-bookings'),

  getBookingById: (id) =>
    api.get(`/bookings/${id}`),

  createBooking: (data) =>
    api.post('/bookings', data),

  payBooking: (id, data) =>
    api.post(`/bookings/${id}/pay`, data),

  cancelBooking: (id) =>
    api.post(`/bookings/${id}/cancel`),

  verifyQR: (qrCode) =>
    api.post('/bookings/verify-qr', { qrCode }),
};

export default bookingService;
