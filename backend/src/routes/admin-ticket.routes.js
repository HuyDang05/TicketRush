const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { eventIdParams } = require('../validators/common.validator');
const { ticketBuyersQuery } = require('../validators/admin.validator');

const {
  getAdminTicketEvents,
  getAdminTicketBuyers,
} = require('../controllers/admin-ticket.controller');

const router = Router();

/**
 * @swagger
 * /api/admin/tickets/events:
 *   get:
 *     tags: [Admin Tickets]
 *     summary: Lấy danh sách sự kiện kèm thống kê vé
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách sự kiện và số vé
 */
router.get(
  '/tickets/events',
  authMiddleware,
  requireRole('ADMIN'),
  getAdminTicketEvents
);

/**
 * @swagger
 * /api/admin/tickets/events/{eventId}/buyers:
 *   get:
 *     tags: [Admin Tickets]
 *     summary: Lấy danh sách người mua vé của một sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách người mua vé
 */
router.get(
  '/tickets/events/:eventId/buyers',
  authMiddleware,
  requireRole('ADMIN'),
  validate({ params: eventIdParams, query: ticketBuyersQuery }),
  getAdminTicketBuyers
);

module.exports = router;
