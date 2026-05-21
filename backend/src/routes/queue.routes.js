const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  joinQueue,
  queueStatus,
  leaveQueue,
  validateQueueToken,
  queueStats,
} = require('../controllers/queue.controller');
const requireRole = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { queueEventParams, queueTokenBody } = require('../validators/queue.validator');

const router = Router();

// Tất cả route yêu cầu đăng nhập
router.use(authMiddleware);

router.post('/:eventId/join', validate({ params: queueEventParams }), joinQueue);
router.get('/:eventId/status', validate({ params: queueEventParams }), queueStatus);
router.post('/:eventId/release', validate({ params: queueEventParams }), leaveQueue);
router.post(
  '/:eventId/validate',
  validate({ params: queueEventParams, body: queueTokenBody }),
  validateQueueToken
);
router.get('/:eventId/stats', requireRole('ADMIN'), validate({ params: queueEventParams }), queueStats);

module.exports = router;
