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
router.get(
  '/pending',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  getMyPendingLocksHandler
);

// POST /api/bookings/lock
router.post(
  '/lock',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  lockSeatHandler
);

// POST /api/bookings/checkout
router.post(
  '/checkout',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  checkoutHandler
);

// DELETE /api/bookings/:bookingId/release
router.delete(
  '/:bookingId/release',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  releaseSeatHandler
);

module.exports = router;
