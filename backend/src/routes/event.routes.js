const express = require('express');
const { getEventSearchSuggestions, getEvents, getEventById } = require('../controllers/event.controller');
const { getEventComments, createEventComment } = require('../controllers/comment.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../config/multer');
const { idParams } = require('../validators/common.validator');
const { createCommentBody } = require('../validators/comment.validator');
const { eventSuggestionsQuery, publicEventsQuery } = require('../validators/event.validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: API sự kiện phía người dùng
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Lấy danh sách sự kiện công khai
 *     description: Lấy danh sách sự kiện kèm minPrice, có thể lọc/tìm kiếm bằng query.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Từ khóa tìm kiếm sự kiện
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         required: false
 *         description: Trạng thái sự kiện
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         example: 10
 *     responses:
 *       200:
 *         description: Lấy danh sách sự kiện thành công
 */
router.get('/', validate({ query: publicEventsQuery }), getEvents);

router.get(
  '/search-suggestions',
  validate({ query: eventSuggestionsQuery }),
  getEventSearchSuggestions
);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Lấy chi tiết sự kiện
 *     description: Lấy chi tiết sự kiện kèm zone và sơ đồ ghế đầy đủ.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sự kiện
 *     responses:
 *       200:
 *         description: Lấy chi tiết sự kiện thành công
 *       404:
 *         description: Không tìm thấy sự kiện
 */
router.get('/:id', validate({ params: idParams }), getEventById);

/**
 * @swagger
 * /api/events/{id}/comments:
 *   get:
 *     tags: [Events]
 *     summary: Lấy danh sách bình luận của sự kiện
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sự kiện
 *     responses:
 *       200:
 *         description: Lấy danh sách bình luận thành công
 */
router.get('/:id/comments', validate({ params: idParams }), getEventComments);

/**
 * @swagger
 * /api/events/{id}/comments:
 *   post:
 *     tags: [Events]
 *     summary: Tạo bình luận/review cho sự kiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sự kiện
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Sự kiện rất hay!
 *               rating:
 *                 type: number
 *                 example: 5
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh đính kèm bình luận
 *     responses:
 *       201:
 *         description: Tạo bình luận thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 */
router.post(
  '/:id/comments',
  authenticate,
  requireRole('CUSTOMER'),
  upload.single('image'),
  validate({ params: idParams, body: createCommentBody }),
  createEventComment
);

module.exports = router;
