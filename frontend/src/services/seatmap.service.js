import api from './api';

/**
 * Lưu seatmap.
 * PUT /api/admin/events/:eventId/seatmap
 *
 * Backend expects { seatmapVersion, seatmap } and returns { seatmapVersion }.
 * Optimistic-concurrency: pass the current version so the server can reject
 * stale writes (409 Conflict) and return the actual currentVersion.
 *
 * @param {string} eventId
 * @param {number} version   — current seatmapVersion held by the client
 * @param {object} seatmap   — full seatmap payload { venue, zones[] }
 */
export async function saveSeatmap(eventId, version, seatmap) {
  return api.put(`/admin/events/${eventId}/seatmap`, {
    seatmapVersion: version,
    seatmap,
  });
}

/**
 * Load seatmap.
 * GET /api/admin/events/:eventId/seatmap
 *
 * Returns { seatmapJson, seatmapVersion }.
 *
 * @param {string} eventId
 */
export async function loadSeatmap(eventId) {
  return api.get(`/admin/events/${eventId}/seatmap`);
}

/**
 * Upload background image for the canvas.
 * POST /api/admin/events/:eventId/seatmap/background
 *
 * NOTE: this endpoint does not exist on the backend yet.
 * The backend will need a multer/storage middleware + route before this works.
 * Returns { url } — the stored image URL.
 *
 * @param {string} eventId
 * @param {File}   file     — image file from <input type="file">
 */
export async function uploadBackground(eventId, file) {
  const formData = new FormData();
  formData.append('image', file);
  return api.post(`/admin/events/${eventId}/seatmap/background`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
