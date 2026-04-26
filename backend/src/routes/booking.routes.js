const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const { lockSeatHandler } = require('../controllers/booking.controller');
const { checkoutHandler } = require('../controllers/checkout.controller');

const router = Router();

// POST /api/bookings/lock — Customer only
router.post(
  '/lock',
  authMiddleware,
  requireRole('CUSTOMER'),
  lockSeatHandler
);

// POST /api/bookings/checkout — Customer only
router.post(
  '/checkout',
  authMiddleware,
  requireRole('CUSTOMER'),
  checkoutHandler
);

module.exports = router;
