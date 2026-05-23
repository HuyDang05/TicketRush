// Purpose: Test tu dong de bao ve behavior quan trong cua module lien quan.
const test = require('node:test');
const assert = require('node:assert/strict');

const { loginBody, registerBody, resetPasswordBody } = require('../src/validators/auth.validator');
const {
  createEventBody,
  publicEventsQuery,
  updateEventBody,
} = require('../src/validators/event.validator');

function futureIso(days = 1) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

test('auth register validator trims and normalizes user input', () => {
  const parsed = registerBody.parse({
    email: '  USER@Example.COM ',
    password: 'TicketRush123',
    fullName: '  Nguyen Van A  ',
    dob: '2000-01-01',
    gender: 'other',
  });

  assert.equal(parsed.email, 'user@example.com');
  assert.equal(parsed.fullName, 'Nguyen Van A');
  assert.equal(parsed.gender, 'OTHER');
});

test('auth validators reject weak or malformed payloads', () => {
  assert.equal(loginBody.safeParse({ email: 'bad-email', password: 'x' }).success, false);
  assert.equal(registerBody.safeParse({
    email: 'a@example.com',
    password: 'short',
    fullName: 'A',
    dob: '2030-01-01',
    gender: 'invalid',
  }).success, false);
  assert.equal(resetPasswordBody.safeParse({
    token: 'not-a-token',
    password: 'TicketRush123',
  }).success, false);
});

test('create event validator accepts valid event payload and normalizes date alias', () => {
  const parsed = createEventBody.parse({
    title: 'Concert TicketRush',
    description: 'A valid event',
    venue: 'Ho Chi Minh City',
    date: futureIso(2),
    endDate: futureIso(3),
    category: 'music',
    imageUrl: 'https://example.com/banner.png',
    zones: [
      { name: 'VIP', rows: '2', cols: '10', price: '500000' },
    ],
  });

  assert.equal(parsed.title, 'Concert TicketRush');
  assert.equal(parsed.startDate, parsed.date);
  assert.equal(parsed.zones[0].rows, 2);
  assert.equal(parsed.zones[0].price, 500000);
});

test('event validators reject unsafe dates, categories, and empty updates', () => {
  assert.equal(createEventBody.safeParse({
    title: 'Concert TicketRush',
    venue: 'Ho Chi Minh City',
    startDate: '2000-01-01T00:00:00.000Z',
  }).success, false);

  assert.equal(publicEventsQuery.safeParse({ categories: 'music,invalid' }).success, false);
  assert.equal(updateEventBody.safeParse({}).success, false);
  assert.equal(updateEventBody.safeParse({
    startDate: futureIso(4),
    endDate: futureIso(2),
  }).success, false);
});
