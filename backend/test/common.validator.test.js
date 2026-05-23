// Purpose: Test tu dong de bao ve behavior quan trong cua module lien quan.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  idParams,
  optionalHttpsUrl,
  paginationQuery,
  searchQuery,
} = require('../src/validators/common.validator');

const uuid = '11111111-1111-4111-8111-111111111111';

test('common id validator accepts uuid params only', () => {
  assert.equal(idParams.safeParse({ id: uuid }).success, true);
  assert.equal(idParams.safeParse({ id: 'not-uuid' }).success, false);
});

test('common image URL validator accepts https, data images, empty, and rejects http', () => {
  assert.equal(optionalHttpsUrl.parse(' https://example.com/a.png '), 'https://example.com/a.png');
  assert.equal(optionalHttpsUrl.parse('data:image/png;base64,abc'), 'data:image/png;base64,abc');
  assert.equal(optionalHttpsUrl.parse(''), undefined);
  assert.equal(optionalHttpsUrl.safeParse('http://example.com/a.png').success, false);
});

test('pagination query coerces defaults and respects max limits', () => {
  const parsed = paginationQuery.parse({});

  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 10);
  assert.equal(paginationQuery.parse({ page: '2', limit: '30' }).page, 2);
  assert.equal(paginationQuery.safeParse({ page: '0' }).success, false);
  assert.equal(paginationQuery.safeParse({ limit: '101' }).success, false);
});

test('search query trims search text and preserves passthrough params', () => {
  const parsed = searchQuery.parse({ search: '  concert  ', category: 'music' });

  assert.equal(parsed.search, 'concert');
  assert.equal(parsed.category, 'music');
  assert.equal(searchQuery.safeParse({ search: 'x'.repeat(101) }).success, false);
});
