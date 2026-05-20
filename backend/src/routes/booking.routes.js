const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const {
  lockSeatHandler,
  getMyTicketsHandler,
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

// POST /api/bookings/lock
router.post(
  '/lock',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  validate({ body: lockSeatBody }),
  lockSeatHandler
);

// POST /api/bookings/checkout
router.post(
  '/checkout',
  authMiddleware,
  requireRole(['CUSTOMER', 'ADMIN']),
  validate({ body: checkoutBody }),
  checkoutHandler
);

module.exports = router;
