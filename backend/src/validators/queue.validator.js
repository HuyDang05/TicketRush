const { z } = require('zod');
const { eventIdParams } = require('./common.validator');

const queueTokenBody = z.object({
  token: z.string().trim().min(16, 'Token không hợp lệ').max(128, 'Token không hợp lệ'),
}).strict();

module.exports = {
  queueEventParams: eventIdParams,
  queueTokenBody,
};
