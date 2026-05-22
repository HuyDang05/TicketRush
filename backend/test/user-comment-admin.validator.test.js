const test = require('node:test');
const assert = require('node:assert/strict');

const { ticketBuyersQuery, audienceQuery } = require('../src/validators/admin.validator');
const { createCommentBody } = require('../src/validators/comment.validator');
const { changePasswordBody, updateProfileBody } = require('../src/validators/user.validator');
const { uploadQuery } = require('../src/validators/upload.validator');

const uuid = '11111111-1111-4111-8111-111111111111';

test('user profile validator trims names and validates avatar URL scheme', () => {
  const parsed = updateProfileBody.parse({
    fullName: '  Nguyen Van A  ',
    avatarUrl: 'https://example.com/avatar.png',
  });

  assert.equal(parsed.fullName, 'Nguyen Van A');
  assert.equal(updateProfileBody.safeParse({
    fullName: 'Nguyen Van A',
    avatarUrl: 'http://example.com/avatar.png',
  }).success, false);
});

test('change password validator requires a different valid new password', () => {
  assert.equal(changePasswordBody.safeParse({
    currentPassword: 'TicketRush123',
    newPassword: 'TicketRush456',
  }).success, true);

  assert.equal(changePasswordBody.safeParse({
    currentPassword: 'TicketRush123',
    newPassword: 'TicketRush123',
  }).success, false);
});

test('comment validator enforces rating range and non-empty text', () => {
  const parsed = createCommentBody.parse({ rating: '5', text: '  Great event  ' });

  assert.equal(parsed.rating, 5);
  assert.equal(parsed.text, 'Great event');
  assert.equal(createCommentBody.safeParse({ rating: 0, text: 'Bad' }).success, false);
  assert.equal(createCommentBody.safeParse({ rating: 6, text: 'Bad' }).success, false);
  assert.equal(createCommentBody.safeParse({ rating: 5, text: '' }).success, false);
});

test('admin and upload validators accept allowed filters only', () => {
  assert.equal(ticketBuyersQuery.parse({}).sortBy, 'time');
  assert.equal(ticketBuyersQuery.safeParse({ sortBy: 'name' }).success, true);
  assert.equal(ticketBuyersQuery.safeParse({ sortBy: 'revenue' }).success, false);

  assert.equal(audienceQuery.safeParse({ eventId: uuid }).success, true);
  assert.equal(audienceQuery.safeParse({ eventId: 'bad' }).success, false);

  assert.equal(uploadQuery.safeParse({ type: 'banner' }).success, true);
  assert.equal(uploadQuery.safeParse({ type: 'card' }).success, true);
  assert.equal(uploadQuery.safeParse({ type: 'other' }).success, false);
});
