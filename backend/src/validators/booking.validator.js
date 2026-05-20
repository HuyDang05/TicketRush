const { z } = require('zod');
const { uuid } = require('./common.validator');

const lockSeatBody = z.object({
  seatId: uuid,
  socketId: z.string().trim().max(120, 'socketId tối đa 120 ký tự').optional(),
}).strict();

const checkoutBody = z.object({
  bookingIds: z.array(uuid).min(1, 'bookingIds không được rỗng').max(4, 'Chỉ được checkout tối đa 4 booking'),
}).strict();

module.exports = {
  checkoutBody,
  lockSeatBody,
};
