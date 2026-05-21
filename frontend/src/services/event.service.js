import api from './api';

const eventService = {
  // Public routes — GET /api/events (chỉ PUBLISHED)
  getEvents: (params) =>
    api.get('/events', { params }),

  getEventById: (id) =>
    api.get(`/events/${id}`),

  getEventReviews: (id) =>
    api.get(`/events/${id}/comments`),

  createEventReview: (id, formData) =>
    api.post(`/events/${id}/comments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getEventZones: (id) =>
    api.get(`/events/${id}`).then((res) => ({ data: res.data.event?.zones || [] })),

  getZoneSeats: (zoneId) =>
    Promise.resolve({ data: [] }),

  // Admin routes — yêu cầu xác thực
  getAdminEvents: (params) =>
    api.get('/admin/events', { params }),

  getAdminEventById: (id) =>
    api.get(`/admin/events/${id}`),

  /** Upload ảnh banner sự kiện (1280×720) */
  uploadEventImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/admin/upload?type=banner', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Upload ảnh card sự kiện (720×958) */
  uploadCardImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/admin/upload?type=card', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createEvent: (data) =>
    api.post('/admin/events', data),

  updateEvent: (id, data) =>
    api.put(`/admin/events/${id}`, data),

  publishEvent: (id) =>
    api.patch(`/admin/events/${id}/publish`),

  endEvent: (id) =>
    api.patch(`/admin/events/${id}/end`),

  deleteEvent: (id) =>
    api.delete(`/admin/events/${id}`),

  getSeatmap: (id) =>
    api.get(`/admin/events/${id}/seatmap`),

  saveSeatmap: (id, seatmapVersion, seatmap) =>
    api.put(`/admin/events/${id}/seatmap`, { seatmapVersion, seatmap }),
};

export default eventService;
