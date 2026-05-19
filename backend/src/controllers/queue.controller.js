const {
  tryAdmit,
  getStatus,
  releaseSlot,
  validateToken,
  getQueueStats,
} = require('../services/queue.service');

/**
 * POST /api/queue/:eventId/join
 * Được gọi khi user nhấn "Chọn ghế & Đặt vé".
 * Trả về token ngay nếu còn slot, hoặc position trong queue.
 */
async function joinQueue(req, res) {
  const { eventId } = req.params;
  const userId = req.user.id;

  try {
    const result = await tryAdmit(eventId, userId);
    return res.json(result);
  } catch (err) {
    console.error('[Queue] joinQueue error:', err.message);
    return res.status(500).json({ message: 'Lỗi hệ thống hàng chờ' });
  }
}

/**
 * GET /api/queue/:eventId/status
 * Polling endpoint — frontend gọi mỗi 3s để cập nhật vị trí.
 */
async function queueStatus(req, res) {
  const { eventId } = req.params;
  const userId = req.user.id;

  try {
    const result = await getStatus(eventId, userId);
    return res.json(result);
  } catch (err) {
    console.error('[Queue] queueStatus error:', err.message);
    return res.status(500).json({ message: 'Lỗi hệ thống hàng chờ' });
  }
}

/**
 * POST /api/queue/:eventId/release
 * Gọi khi user hoàn tất thanh toán hoặc rời trang seat selection.
 */
async function leaveQueue(req, res) {
  const { eventId } = req.params;
  const userId = req.user.id;

  try {
    await releaseSlot(eventId, userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Queue] leaveQueue error:', err.message);
    return res.status(500).json({ message: 'Lỗi hệ thống hàng chờ' });
  }
}

/**
 * POST /api/queue/:eventId/validate
 * SeatSelectionPage gọi để xác thực token trước khi render.
 */
async function validateQueueToken(req, res) {
  const { eventId } = req.params;
  const userId = req.user.id;
  const { token } = req.body;

  try {
    if (!token) return res.status(400).json({ valid: false });
    const valid = await validateToken(eventId, userId, token);
    return res.json({ valid });
  } catch (err) {
    console.error('[Queue] validateToken error:', err.message);
    return res.status(500).json({ valid: false });
  }
}

/**
 * GET /api/queue/:eventId/stats  (admin / debug)
 */
async function queueStats(req, res) {
  const { eventId } = req.params;
  try {
    const stats = await getQueueStats(eventId);
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  joinQueue,
  queueStatus,
  leaveQueue,
  validateQueueToken,
  queueStats,
};
