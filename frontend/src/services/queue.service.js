import api from './api';

export function getQueueSessionId(eventId, preferredSessionId) {
  return preferredSessionId || `tkr-q-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const queueService = {
  join: (eventId, queueSessionId) =>
    api.post(`/queue/${eventId}/join`, { queueSessionId }).then((r) => r.data),

  status: (eventId, queueSessionId) =>
    api.get(`/queue/${eventId}/status`, { params: { queueSessionId } }).then((r) => r.data),

  release: (eventId, queueSessionId) =>
    api.post(`/queue/${eventId}/release`, { queueSessionId }).then((r) => r.data),

  validate: (eventId, token, queueSessionId) =>
    api.post(`/queue/${eventId}/validate`, { token, queueSessionId }).then((r) => r.data),

  heartbeat: (eventId, token, queueSessionId) =>
    api.post(`/queue/${eventId}/validate`, { token, queueSessionId }).then((r) => r.data),
};

export default queueService;
