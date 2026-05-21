const { z } = require('zod');
const { eventIdQuery } = require('./common.validator');

const ticketBuyersQuery = z.object({
  sortBy: z.enum(['time', 'name']).default('time'),
}).strict();

module.exports = {
  audienceQuery: eventIdQuery,
  ticketBuyersQuery,
};
