// Purpose: Schema validate input API truoc khi controller xu ly nghiep vu.
const { z } = require('zod');
const { nonEmptyTrimmedString } = require('./common.validator');

const createCommentBody = z.object({
  rating: z.coerce.number().int().min(1, 'Đánh giá phải từ 1 đến 5 sao').max(5, 'Đánh giá phải từ 1 đến 5 sao'),
  text: nonEmptyTrimmedString('Nội dung đánh giá', 1, 1000),
}).strict();

module.exports = {
  createCommentBody,
};
