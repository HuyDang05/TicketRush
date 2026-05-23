// Purpose: Schema validate input API truoc khi controller xu ly nghiep vu.
const { z } = require('zod');

const uploadQuery = z.object({
  type: z.enum(['banner', 'card']).optional(),
}).strict();

module.exports = {
  uploadQuery,
};
