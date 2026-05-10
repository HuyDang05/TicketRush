const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

const {
  getAdminTicketEvents,
  getAdminTicketBuyers,
} = require('../controllers/admin-ticket.controller');

const router = Router();

router.get(
  '/tickets/events',
  authMiddleware,
  requireRole('ADMIN'),
  getAdminTicketEvents
);

router.get(
  '/tickets/events/:eventId/buyers',
  authMiddleware,
  requireRole('ADMIN'),
  getAdminTicketBuyers
);

module.exports = router;