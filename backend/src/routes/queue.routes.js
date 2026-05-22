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

/**
 * @swagger
 * tags:
 *   name: Queue
 *   description: Hệ thống hàng chờ mua vé
 */

// Tất cả route yêu cầu đăng nhập
router.use(authMiddleware);

/**
 * @swagger
 * /api/queue/{eventId}/join:
 *   post:
 *     tags: [Queue]
 *     summary: Tham gia hàng chờ mua vé
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sự kiện
 *     responses:
 *       200:
 *         description: Tham gia hàng chờ thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
  '/:eventId/join',
  validate({ params: queueEventParams }),
  joinQueue
);

/**
 * @swagger
 * /api/queue/{eventId}/status:
 *   get:
 *     tags: [Queue]
 *     summary: Lấy trạng thái hàng chờ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sự kiện
 *     responses:
 *       200:
 *         description: Trạng thái hàng chờ
 */
router.get(
  '/:eventId/status',
  validate({ params: queueEventParams }),
  queueStatus
);

/**
 * @swagger
 * /api/queue/{eventId}/release:
 *   post:
 *     tags: [Queue]
 *     summary: Rời khỏi hàng chờ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sự kiện
 *     responses:
 *       200:
 *         description: Rời hàng chờ thành công
 */
router.post(
  '/:eventId/release',
  validate({ params: queueEventParams }),
  leaveQueue
);

/**
 * @swagger
 * /api/queue/{eventId}/validate:
 *   post:
 *     tags: [Queue]
 *     summary: Validate queue token
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sự kiện
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: queue_token_123
 *     responses:
 *       200:
 *         description: Token hợp lệ
 *       400:
 *         description: Token không hợp lệ
 */
router.post(
  '/:eventId/validate',
  validate({ params: queueEventParams, body: queueTokenBody }),
  validateQueueToken
);

/**
 * @swagger
 * /api/queue/{eventId}/stats:
 *   get:
 *     tags: [Queue]
 *     summary: Lấy thống kê hàng chờ (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sự kiện
 *     responses:
 *       200:
 *         description: Thống kê queue
 *       403:
 *         description: Không có quyền admin
 */
router.get(
  '/:eventId/stats',
  requireRole('ADMIN'),
  validate({ params: queueEventParams }),
  queueStats
);

module.exports = router;