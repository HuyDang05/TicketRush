// Purpose: Test tu dong de bao ve behavior quan trong cua module lien quan.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../src/utils/jwt.util');

test('jwt utils require JWT_SECRET before signing or verifying', () => {
  const oldSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  assert.throws(() => signAccessToken({ id: 'user-1' }), /JWT_SECRET/);

  if (oldSecret) process.env.JWT_SECRET = oldSecret;
});

test('jwt utils sign and verify access and refresh tokens', () => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '2h';

  const accessToken = signAccessToken({ id: 'user-1', role: 'CUSTOMER' });
  const refreshToken = signRefreshToken({ id: 'user-1', type: 'refresh' });

  assert.equal(verifyAccessToken(accessToken).id, 'user-1');
  assert.equal(verifyAccessToken(accessToken).role, 'CUSTOMER');
  assert.equal(verifyRefreshToken(refreshToken).type, 'refresh');

  if (oldSecret) process.env.JWT_SECRET = oldSecret;
  else delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
  delete process.env.JWT_REFRESH_EXPIRES_IN;
});
