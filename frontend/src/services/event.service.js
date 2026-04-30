import api from './api';

const eventService = {
  // Public routes — GET /api/events
  getEvents: (params) =>
    api.get('/events', { params }),

  getEventById: (id) =>
    api.get(`/events/${id}`),

  getEventZones: (id) =>
    api.get(`/events/${id}`).then((res) => ({ data: res.data.event?.zones || [] })),

  getZoneSeats: (zoneId) =>
    Promise.resolve({ data: [] }),

  // Admin routes — POST/PUT/PATCH/DELETE /api/admin/events
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
};

export default eventService;
