const express = require('express');
const { getEvents, getEventById } = require('../controllers/event.controller');
const { getEventComments, createEventComment } = require('../controllers/comment.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../config/multer');
const { idParams } = require('../validators/common.validator');
const { createCommentBody } = require('../validators/comment.validator');
const { publicEventsQuery } = require('../validators/event.validator');

const router = express.Router();

// Lấy danh sách sự kiện kèm minPrice
router.get('/', validate({ query: publicEventsQuery }), getEvents);

// Lấy chi tiết sự kiện kèm zone và full seat sơ đồ
router.get('/:id', validate({ params: idParams }), getEventById);

// Review/Comment endpoints
router.get('/:id/comments', validate({ params: idParams }), getEventComments);
router.post(
	'/:id/comments',
	authenticate,
	requireRole('CUSTOMER'),
	upload.single('image'),
	validate({ params: idParams, body: createCommentBody }),
	createEventComment
);

module.exports = router;
