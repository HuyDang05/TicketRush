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
  validate({ params: eventIdParams, query: ticketBuyersQuery }),
  getAdminTicketBuyers
);

module.exports = router;
