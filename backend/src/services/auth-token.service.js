// Purpose: Service chua nghiep vu chinh cua backend, tach khoi controller de de test va tai su dung.
const crypto = require('crypto');

const prisma = require('../config/prisma');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt.util');

const REFRESH_COOKIE_NAME = 'refreshToken';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';

const durationToMs = (value) => {
  if (typeof value === 'number') return value * 1000;
  if (typeof value !== 'string' || !value.trim()) return durationToMs(DEFAULT_REFRESH_EXPIRES_IN);

  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) return durationToMs(DEFAULT_REFRESH_EXPIRES_IN);

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return durationToMs(DEFAULT_REFRESH_EXPIRES_IN);
  }
};

const getRefreshTokenMaxAge = () => durationToMs(process.env.JWT_REFRESH_EXPIRES_IN || DEFAULT_REFRESH_EXPIRES_IN);

const getRefreshTokenExpiresAt = () => new Date(Date.now() + getRefreshTokenMaxAge());

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: getRefreshTokenMaxAge(),
});

const getClearRefreshCookieOptions = () => ({
  ...getRefreshCookieOptions(),
  maxAge: undefined,
});

const buildAccessToken = (user) =>
  signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

const createRefreshToken = async (userId) => {
  const token = signRefreshToken({ id: userId, type: 'refresh' });
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(token),
      expiresAt: getRefreshTokenExpiresAt(),
    },
  });
  return token;
};

const issueAuthTokens = async (res, user) => {
  const token = buildAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
  return token;
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, getClearRefreshCookieOptions());
};

const rotateRefreshToken = async (rawToken) => {
  const payload = verifyRefreshToken(rawToken);
  if (payload?.type !== 'refresh' || !payload?.id) {
    throw new Error('Invalid refresh token');
  }

  const tokenHash = hashRefreshToken(rawToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.expiresAt <= new Date()) {
    if (storedToken) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    }
    throw new Error('Invalid refresh token');
  }

  if (storedToken.userId !== payload.id || !storedToken.user) {
    throw new Error('Invalid refresh token');
  }

  const nextRawToken = signRefreshToken({ id: storedToken.userId, type: 'refresh' });
  const nextHash = hashRefreshToken(nextRawToken);
  const nextExpiresAt = getRefreshTokenExpiresAt();

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: {
      tokenHash: nextHash,
      expiresAt: nextExpiresAt,
    },
  });

  return {
    accessToken: buildAccessToken(storedToken.user),
    refreshToken: nextRawToken,
    user: storedToken.user,
  };
};

const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;

  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashRefreshToken(rawToken) },
  });
};

module.exports = {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  getRefreshCookieOptions,
  issueAuthTokens,
  revokeRefreshToken,
  rotateRefreshToken,
};
