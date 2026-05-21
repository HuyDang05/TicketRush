const Redis = require('ioredis');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function scanKeys(pattern) {
  let cursor = '0';
  const keys = [];

  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  return keys;
}

async function resetEvent(eventId) {
  const keys = await scanKeys(`vq:${eventId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  return keys.length;
}

async function main() {
  const eventId = process.argv[2];
  if (!eventId) {
    console.error('Usage: node scripts/reset-virtual-queue.js <eventId>');
    process.exitCode = 1;
    return;
  }

  const deleted = await resetEvent(eventId);
  console.log(`Reset virtual queue for event ${eventId}. Deleted ${deleted} Redis key(s).`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => redis.disconnect());
