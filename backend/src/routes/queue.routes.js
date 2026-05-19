const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  joinQueue,
  queueStatus,
  leaveQueue,
  validateQueueToken,
  queueStats,
} = require('../controllers/queue.controller');

const router = Router();

// Tất cả route yêu cầu đăng nhập
router.use(authMiddleware);

router.post('/:eventId/join',     joinQueue);
router.get('/:eventId/status',    queueStatus);
router.post('/:eventId/release',  leaveQueue);
router.post('/:eventId/validate', validateQueueToken);
router.get('/:eventId/stats',     queueStats);

module.exports = router;
