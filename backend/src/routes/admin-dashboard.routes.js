const { Router } = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { eventIdParams } = require('../validators/common.validator');
const { audienceQuery } = require('../validators/admin.validator');
const {
  getAdminDashboardHandler,
} = require('../controllers/admin-dashboard.controller');

const {
  getAudienceAnalyticsHandler,
} = require('../controllers/admin-analytics.controller');

const router = Router();

/**
 * @swagger
 * /api/admin/dashboard/{eventId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard stats
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/dashboard/:eventId',
  authMiddleware,
  requireRole('ADMIN'),
  validate({ params: eventIdParams }),
  getAdminDashboardHandler
);

/**
 * @swagger
 * /api/admin/analytics/audience:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get audience analytics
 *     description: Thống kê giới tính và độ tuổi của user đã mua vé PAID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: eventId
 *         required: false
 *         schema:
 *           type: string
 *         description: Lọc theo sự kiện cụ thể, bỏ trống để lấy tất cả sự kiện
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/analytics/audience',
  authMiddleware,
  requireRole('ADMIN'),
  validate({ query: audienceQuery }),
  getAudienceAnalyticsHandler
);

module.exports = router;
