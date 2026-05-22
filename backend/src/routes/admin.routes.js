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

/**
 * @swagger
 * tags:
 *   name: Admin Events
 *   description: Quản lý sự kiện phía admin
 */

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     tags: [Admin Events]
 *     summary: Lấy profile admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile
 */
router.get('/profile', authenticate, requireAdmin, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

router.get('/accounts', authenticate, requireAdmin, getAdminAccounts);
router.post('/accounts', authenticate, requireAdmin, createAdminAccount);

// Upload ảnh sự kiện lên Cloudinary

/**
 * @swagger
 * /api/admin/upload:
 *   post:
 *     tags: [Admin Events]
 *     summary: Upload ảnh sự kiện lên Cloudinary
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload thành công
 */
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  validate({ query: uploadQuery }),
  upload.single('image'),
  uploadImage
);

// Event management endpoints (Admin only)

/**
 * @swagger
 * /api/admin/events:
 *   get:
 *     tags: [Admin Events]
 *     summary: Admin lấy danh sách sự kiện
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách sự kiện admin
 */
router.get('/events', authenticate, requireAdmin, validate({ query: adminEventsQuery }), getAdminEvents);

/**
 * @swagger
 * /api/admin/events/{id}:
 *   get:
 *     tags: [Admin Events]
 *     summary: Admin lấy chi tiết sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết sự kiện
 */
router.get('/events/:id', authenticate, requireAdmin, validate({ params: idParams }), getAdminEventById);

/**
 * @swagger
 * /api/admin/events:
 *   post:
 *     tags: [Admin Events]
 *     summary: Tạo sự kiện mới
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tạo sự kiện thành công
 */
router.post('/events', authenticate, requireAdmin, validate({ body: createEventBody }), createEvent);

/**
 * @swagger
 * /api/admin/events/{id}:
 *   put:
 *     tags: [Admin Events]
 *     summary: Cập nhật sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/events/:id', authenticate, requireAdmin, validate({ params: idParams, body: updateEventBody }), updateEvent);

/**
 * @swagger
 * /api/admin/events/{id}/seatmap:
 *   get:
 *     tags: [Admin Events]
 *     summary: Lấy sơ đồ ghế của sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Seatmap
 */
router.get('/events/:id/seatmap', authenticate, requireAdmin, validate({ params: idParams }), getSeatmap);

/**
 * @swagger
 * /api/admin/events/{id}/seatmap:
 *   put:
 *     tags: [Admin Events]
 *     summary: Lưu sơ đồ ghế của sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lưu seatmap thành công
 */
router.put('/events/:id/seatmap', authenticate, requireAdmin, validate({ params: idParams, body: saveSeatmapBody }), saveSeatmap);

/**
 * @swagger
 * /api/admin/events/{id}/publish:
 *   patch:
 *     tags: [Admin Events]
 *     summary: Publish sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Publish thành công
 */
router.patch('/events/:id/publish', authenticate, requireAdmin, validate({ params: idParams }), publishEvent);

/**
 * @swagger
 * /api/admin/events/{id}/end:
 *   patch:
 *     tags: [Admin Events]
 *     summary: Kết thúc sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kết thúc sự kiện thành công
 */
router.patch('/events/:id/end', authenticate, requireAdmin, validate({ params: idParams }), endEvent);

/**
 * @swagger
 * /api/admin/events/{id}:
 *   delete:
 *     tags: [Admin Events]
 *     summary: Xóa sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete('/events/:id', authenticate, requireAdmin, validate({ params: idParams }), deleteEvent);

module.exports = router;
