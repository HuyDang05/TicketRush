const { Router } = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const {
  getAdminDashboardHandler,
} = require('../controllers/admin-dashboard.controller');

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
  getAdminDashboardHandler
);

module.exports = router;