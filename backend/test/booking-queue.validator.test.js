const test = require('node:test');
const assert = require('node:assert/strict');

const { checkoutBody, lockSeatBody } = require('../src/validators/booking.validator');
const { queueEventParams, queueTokenBody } = require('../src/validators/queue.validator');

const uuid = '11111111-1111-4111-8111-111111111111';

test('lock seat validator accepts required queue context', () => {
  const parsed = lockSeatBody.parse({
    seatId: 'zone-1-A1',
    socketId: 'socket-1',
    queueToken: 'x'.repeat(16),
    queueSessionId: 'session-1',
  });

  assert.equal(parsed.seatId, 'zone-1-A1');
  assert.equal(parsed.queueToken.length, 16);
});

test('lock seat validator rejects missing or oversized queue fields', () => {
  assert.equal(lockSeatBody.safeParse({ seatId: 'A1' }).success, false);
  assert.equal(lockSeatBody.safeParse({
    seatId: 'A1',
    queueToken: 'short',
    queueSessionId: 'session-1',
  }).success, false);
  assert.equal(lockSeatBody.safeParse({
    seatId: 'A1',
    socketId: 'x'.repeat(121),
    queueToken: 'x'.repeat(16),
    queueSessionId: 'session-1',
  }).success, false);
});

test('checkout validator enforces uuid booking id limits', () => {
  assert.equal(checkoutBody.safeParse({ bookingIds: [uuid] }).success, true);
  assert.equal(checkoutBody.safeParse({ bookingIds: [] }).success, false);
  assert.equal(checkoutBody.safeParse({ bookingIds: ['not-uuid'] }).success, false);
  assert.equal(checkoutBody.safeParse({ bookingIds: [uuid, uuid, uuid, uuid, uuid] }).success, false);
});

test('queue validators accept valid params and reject malformed tokens', () => {
  assert.equal(queueEventParams.safeParse({ eventId: uuid }).success, true);
  assert.equal(queueEventParams.safeParse({ eventId: 'bad' }).success, false);
  assert.equal(queueTokenBody.safeParse({
    token: 'x'.repeat(16),
    queueSessionId: 'session-1',
  }).success, true);
  assert.equal(queueTokenBody.safeParse({
    token: 'short',
    queueSessionId: 'session-1',
  }).success, false);
});
