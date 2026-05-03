const express = require('express');
const { getEvents, getEventById } = require('../controllers/event.controller');

const router = express.Router();

// Lấy danh sách sự kiện kèm minPrice
router.get('/', getEvents);

// Lấy chi tiết sự kiện kèm zone và full seat sơ đồ
router.get('/:id', getEventById);

module.exports = router;
