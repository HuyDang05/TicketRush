require('dotenv').config();

function parseRedisUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared base config — dùng để tạo các connection instance riêng
const redisConnectionOptions = parseRedisUrl(REDIS_URL);

module.exports = { redisConnectionOptions };
