const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const {
  lockSeatHandler,
  getMyTicketsHandler,
  releaseSeatHandler,
  getMyPendingLocksHandler,
} = require('../controllers/booking.controller');
const { checkoutHandler } = require('../controllers/checkout.controller');
const validate = require('../middlewares/validate.middleware');
const { checkoutBody, lockSeatBody } = require('../validators/booking.validator');

const router = Router();

/**
 * @swagger
 * /api/bookings/my-tickets:
 *   get:
 *     summary: Get my paid tickets
 *     tags:
 *       - Bookings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of paid tickets
 */
router.get(
  '/my-tickets',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  getMyTicketsHandler
);

// GET /api/bookings/pending

/**
 * @swagger
 * /api/bookings/pending:
 *   get:
 *     tags: [Bookings]
 *     summary: Lấy danh sách các ghế đang được khóa tạm thời
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending locks
 */
router.get(
  '/pending',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  getMyPendingLocksHandler
);

// POST /api/bookings/lock

/**
 * @swagger
 * /api/bookings/lock:
 *   post:
 *     tags: [Bookings]
 *     summary: Khóa ghế tạm thời khi customer chọn ghế
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lock seat successfully
 */
router.post(
  '/lock',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  validate({ body: lockSeatBody }),
  lockSeatHandler
);

// POST /api/bookings/checkout
/**
 * @swagger
 * /api/bookings/checkout:
 *   post:
 *     tags: [Bookings]
 *     summary: Thanh toán vé
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Checkout successfully
 */
router.post(
  '/checkout',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  validate({ body: checkoutBody }),
  checkoutHandler
);

// DELETE /api/bookings/:bookingId/release

/**
 * @swagger
 * /api/bookings/:bookingId/release:
 *   delete:
 *     tags: [Bookings]
 *     summary: Giải phóng ghế đã khóa
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Release seat successfully
 */
router.delete(
  '/:bookingId/release',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  releaseSeatHandler
);

module.exports = router;
