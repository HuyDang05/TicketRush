const { z } = require('zod');

const uploadQuery = z.object({
  type: z.enum(['banner', 'card']).optional(),
}).strict();

module.exports = {
  uploadQuery,
};
