// Purpose: Schema validate input API truoc khi controller xu ly nghiep vu.
const { z } = require('zod');
const { eventIdQuery } = require('./common.validator');

const ticketBuyersQuery = z.object({
  sortBy: z.enum(['time', 'name']).default('time'),
}).strict();

module.exports = {
  audienceQuery: eventIdQuery,
  ticketBuyersQuery,
};
