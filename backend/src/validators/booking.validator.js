const { z } = require('zod');
const { nonEmptyTrimmedString, uuid } = require('./common.validator');

const lockSeatBody = z.object({
  seatId: nonEmptyTrimmedString('seatId', 1, 120),
  socketId: z.string().trim().max(120, 'socketId toi da 120 ky tu').optional(),
  queueToken: z.string().trim().min(16, 'queueToken khong hop le').max(128, 'queueToken khong hop le'),
  queueSessionId: z.string().trim().min(8, 'queueSessionId khong hop le').max(200, 'queueSessionId khong hop le'),
}).strict();

const checkoutBody = z.object({
  bookingIds: z.array(uuid).min(1, 'bookingIds khong duoc rong').max(4, 'Chi duoc checkout toi da 4 booking'),
}).strict();

module.exports = {
  checkoutBody,
  lockSeatBody,
};
