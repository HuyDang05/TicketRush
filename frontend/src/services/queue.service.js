import api from './api';

const queueService = {
  join: (eventId) =>
    api.post(`/queue/${eventId}/join`).then((r) => r.data),

  status: (eventId) =>
    api.get(`/queue/${eventId}/status`).then((r) => r.data),

  release: (eventId) =>
    api.post(`/queue/${eventId}/release`).then((r) => r.data),

  validate: (eventId, token) =>
    api.post(`/queue/${eventId}/validate`, { token }).then((r) => r.data),
};

export default queueService;
