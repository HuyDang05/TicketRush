const express = require('express');
const { getEvents, getEventById } = require('../controllers/event.controller');
const { getEventComments, createEventComment } = require('../controllers/comment.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const upload = require('../config/multer');

const router = express.Router();

// Lấy danh sách sự kiện kèm minPrice
router.get('/', getEvents);

// Lấy chi tiết sự kiện kèm zone và full seat sơ đồ
router.get('/:id', getEventById);

// Review/Comment endpoints
router.get('/:id/comments', getEventComments);
router.post(
	'/:id/comments',
	authenticate,
	requireRole('CUSTOMER'),
	upload.single('image'),
	createEventComment
);

module.exports = router;
