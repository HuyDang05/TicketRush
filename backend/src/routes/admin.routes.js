const express = require('express');

const authenticate = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { createEvent, updateEvent, publishEvent, endEvent, deleteEvent, getAdminEvents, getAdminEventById, getSeatmap, saveSeatmap } = require('../controllers/event.controller');
const { getAdminAccounts, createAdminAccount } = require('../controllers/admin-accounts.controller');
const { uploadImage } = require('../controllers/upload.controller');
const upload = require('../config/multer');
const validate = require('../middlewares/validate.middleware');
const { idParams } = require('../validators/common.validator');
const {
  adminEventsQuery,
  createEventBody,
  updateEventBody,
} = require('../validators/event.validator');
const { saveSeatmapBody } = require('../validators/seatmap.validator');
const { uploadQuery } = require('../validators/upload.validator');

const router = express.Router();

router.get('/profile', authenticate, requireAdmin, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

router.get('/accounts', authenticate, requireAdmin, getAdminAccounts);
router.post('/accounts', authenticate, requireAdmin, createAdminAccount);

// Upload ảnh sự kiện lên Cloudinary
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  validate({ query: uploadQuery }),
  upload.single('image'),
  uploadImage
);

// Event management endpoints (Admin only)
router.get('/events', authenticate, requireAdmin, validate({ query: adminEventsQuery }), getAdminEvents);
router.get('/events/:id', authenticate, requireAdmin, validate({ params: idParams }), getAdminEventById);
router.post('/events', authenticate, requireAdmin, validate({ body: createEventBody }), createEvent);
router.put('/events/:id', authenticate, requireAdmin, validate({ params: idParams, body: updateEventBody }), updateEvent);
router.get('/events/:id/seatmap', authenticate, requireAdmin, validate({ params: idParams }), getSeatmap);
router.put('/events/:id/seatmap', authenticate, requireAdmin, validate({ params: idParams, body: saveSeatmapBody }), saveSeatmap);
router.patch('/events/:id/publish', authenticate, requireAdmin, validate({ params: idParams }), publishEvent);
router.patch('/events/:id/end', authenticate, requireAdmin, validate({ params: idParams }), endEvent);
router.delete('/events/:id', authenticate, requireAdmin, validate({ params: idParams }), deleteEvent);

module.exports = router;
