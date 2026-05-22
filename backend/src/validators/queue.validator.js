const { z } = require('zod');
const { eventIdParams } = require('./common.validator');

const queueTokenBody = z.object({
  token: z.string().trim().min(16, 'Token khong hop le').max(128, 'Token khong hop le'),
  queueSessionId: z.string().trim().min(8, 'Phien hang cho khong hop le').max(200, 'Phien hang cho khong hop le'),
}).strict();

module.exports = {
  queueEventParams: eventIdParams,
  queueTokenBody,
};
