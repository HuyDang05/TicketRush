const express = require('express');

const authenticate = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { createEvent, updateEvent, publishEvent, endEvent, deleteEvent, getSeatmap, saveSeatmap, getAdminEventById } = require('../controllers/event.controller');

const router = express.Router();

router.get('/profile', authenticate, requireAdmin, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// Event management endpoints (Admin only)
router.get('/events/:id', authenticate, requireAdmin, getAdminEventById);
router.post('/events', authenticate, requireAdmin, createEvent);
router.put('/events/:id', authenticate, requireAdmin, updateEvent);
router.get('/events/:id/seatmap', authenticate, requireAdmin, getSeatmap);
router.put('/events/:id/seatmap', authenticate, requireAdmin, saveSeatmap);
router.patch('/events/:id/publish', authenticate, requireAdmin, publishEvent);
router.patch('/events/:id/end', authenticate, requireAdmin, endEvent);
router.delete('/events/:id', authenticate, requireAdmin, deleteEvent);

module.exports = router;
