import api from './api';

const eventService = {
  getEvents: (params) =>
    api.get('/events', { params }),

  getEventById: (id) =>
    api.get(`/events/${id}`),

  createEvent: (data) =>
    api.post('/events', data),

  updateEvent: (id, data) =>
    api.put(`/events/${id}`, data),

  deleteEvent: (id) =>
    api.delete(`/events/${id}`),

  getEventZones: (eventId) =>
    api.get(`/events/${eventId}/zones`),

  getZoneSeats: (zoneId) =>
    api.get(`/zones/${zoneId}/seats`),
};

export default eventService;
