import api from './api';

const eventService = {
  // Public routes — GET /api/events (chỉ PUBLISHED)
  getEvents: (params) =>
    api.get('/events', { params }),

  getEventById: (id) =>
    api.get(`/events/${id}`),

  getEventZones: (id) =>
    api.get(`/events/${id}`).then((res) => ({ data: res.data.event?.zones || [] })),

  getZoneSeats: (zoneId) =>
    Promise.resolve({ data: [] }),

  // Admin routes — yêu cầu xác thực
  getAdminEvents: (params) =>
    api.get('/admin/events', { params }),

  getAdminEventById: (id) =>
    api.get(`/admin/events/${id}`),

  /** Upload ảnh sự kiện lên Cloudinary qua backend */
  uploadEventImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/admin/upload', form, {
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
