import api from './api';

const eventService = {
  getEvents: (params) =>
    api.get('api/events', { params }),

  getEventById: (id) =>
    api.get(`api/events/${id}`),

  createEvent: (data) =>
    api.post('api/events', data),

  updateEvent: (id, data) =>
    api.put(`api/events/${id}`, data),

  deleteEvent: (id) =>
    api.delete(`api/events/${id}`),

  getEventZones: (eventId) =>
    api.get(`api/events/${eventId}/zones`),

  getZoneSeats: (zoneId) =>
    api.get(`api/zones/${zoneId}/seats`),
};

export default eventService;
