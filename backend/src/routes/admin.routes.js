const express = require('express');

const authenticate = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { createEvent, updateEvent, publishEvent, endEvent } = require('../controllers/event.controller');

const router = express.Router();

router.get('/profile', authenticate, requireAdmin, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// Event management endpoints (Admin only)
router.post('/events', authenticate, requireAdmin, createEvent);
router.put('/events/:id', authenticate, requireAdmin, updateEvent);
router.patch('/events/:id/publish', authenticate, requireAdmin, publishEvent);
router.patch('/events/:id/end', authenticate, requireAdmin, endEvent);

module.exports = router;
