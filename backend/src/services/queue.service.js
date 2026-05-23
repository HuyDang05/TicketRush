// Purpose: Service chua nghiep vu chinh cua backend, tach khoi controller de de test va tai su dung.
/**
 * Virtual Queue Service
 *
 * Dùng Redis để quản lý hàng chờ ảo khi lưu lượng vượt ngưỡng DB.
 *
 * Cấu trúc Redis:
 *   vq:{eventId}:list             — Sorted Set, score = timestamp join, member = userId:queueSessionId
 *   vq:{eventId}:waiting:{member} — String TTL, chỉ tồn tại khi tab queue còn sống
 *   vq:{eventId}:token:{memberId} — String, token cấp quyền vào seat selection
 *   vq:{eventId}:active           — Sorted Set, score = token expiry ms, member = userId:queueSessionId
 *
 * Luồng:
 *   1. User nhấn "Chọn ghế" → backend kiểm tra vq:{eventId}:active
 *   2. Nếu active < CAPACITY  → cấp token ngay, redirect tới seats
 *   3. Nếu active >= CAPACITY → enqueue user → trả về position
 *   4. Frontend polling /queue/status mỗi 3s để nhận position + token khi đến lượt
 *   5. Backend cron job (drainQueue) mỗi 5s cấp token cho batch tiếp theo
 */

const Redis = require('ioredis');
const crypto = require('crypto');
const path = require('path');
const { emitSeatEvent } = require('../config/socket');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

const CAPACITY = Number(process.env.QUEUE_CAPACITY) || 50;   // số slot đồng thời
const BATCH    = Number(process.env.QUEUE_BATCH)    || 50;   // user/lượt admit
const TOKEN_TTL = Number(process.env.QUEUE_ACTIVE_TTL_SECONDS) || 45;
const WAITING_TTL = Number(process.env.QUEUE_WAITING_TTL_SECONDS) || 45;

function listKey(eventId)        { return `vq:${eventId}:list`; }
function activeKey(eventId)      { return `vq:${eventId}:active`; }
function waitingKey(eventId, memberId) { return `vq:${eventId}:waiting:${memberId}`; }
function tokenKey(eventId, memberId)  { return `vq:${eventId}:token:${memberId}`; }
function tokenKeyPrefix(eventId)      { return `vq:${eventId}:token:`; }
function waitingKeyPrefix(eventId)    { return `vq:${eventId}:waiting:`; }

function makeMemberId(userId, queueSessionId) {
  if (!queueSessionId) {
    const err = new Error('queueSessionId is required');
    err.statusCode = 400;
    throw err;
  }
  return `${userId}:${queueSessionId}`;
}

function makeTokenValue(userId, token) {
  return `${userId}:${token}`;
}

function readTokenValue(stored) {
  if (!stored) return null;
  const separator = stored.indexOf(':');
  if (separator === -1) return { userId: null, token: stored };
  return {
    userId: stored.slice(0, separator),
    token: stored.slice(separator + 1),
  };
}

function emitQueueUpdated(eventId) {
  try {
    emitSeatEvent(eventId, 'queue_updated', { eventId });
  } catch {
    // Socket may be unavailable in scripts/tests; queue state remains authoritative in Redis.
  }
}

async function cleanupExpiredActive(eventId) {
  const key = activeKey(eventId);
  const type = await redis.type(key);
  // Redis keys may survive old deployments or manual debugging. If the key type
  // is not the zset shape expected by this service, drop it and rebuild state
  // from active tabs instead of letting later Z* commands fail.
  if (type !== 'none' && type !== 'zset') {
    await redis.del(key);
    await removeLegacyUserMembers(eventId);
    await removeInactiveWaitingMembers(eventId);
    return;
  }

  if (type === 'none') {
    await removeLegacyUserMembers(eventId);
    await removeInactiveWaitingMembers(eventId);
    return;
  }

  await redis.zremrangebyscore(key, '-inf', Date.now());
  // The queue is intentionally self-healing: active members need a token, waiting
  // members need a heartbeat key, and legacy userId-only members are removed so
  // multiple tabs from the same account do not collide.
  await removeLegacyUserMembers(eventId);
  await removeTokenlessActiveMembers(eventId);
  await removeInactiveWaitingMembers(eventId);

  const activeCount = await redis.zcard(key);
  if (activeCount > CAPACITY) {
    const overflowUsers = await redis.zrange(key, CAPACITY, -1);
    if (overflowUsers.length > 0) {
      const pipeline = redis.pipeline();
      for (const memberId of overflowUsers) {
        pipeline.del(tokenKey(eventId, memberId));
        pipeline.zrem(key, memberId);
      }
      await pipeline.exec();
    }
  }
}

async function removeTokenlessActiveMembers(eventId) {
  const key = activeKey(eventId);
  const members = await redis.zrange(key, 0, -1);
  if (members.length === 0) return;

  const tokenExists = await Promise.all(
    members.map((memberId) => redis.exists(tokenKey(eventId, memberId)))
  );

  const pipeline = redis.pipeline();
  let hasCommands = false;

  members.forEach((memberId, index) => {
    if (tokenExists[index]) return;
    pipeline.zrem(key, memberId);
    hasCommands = true;
  });

  if (hasCommands) await pipeline.exec();
}

async function removeInactiveWaitingMembers(eventId) {
  const key = listKey(eventId);
  const type = await redis.type(key);
  if (type === 'none') return;
  if (type !== 'zset') {
    await redis.del(key);
    return;
  }

  const members = await redis.zrange(key, 0, -1);
  if (members.length === 0) return;

  const waitingExists = await Promise.all(
    members.map((memberId) => redis.exists(waitingKey(eventId, memberId)))
  );

  const pipeline = redis.pipeline();
  let hasCommands = false;

  members.forEach((memberId, index) => {
    if (waitingExists[index]) return;
    pipeline.zrem(key, memberId);
    hasCommands = true;
  });

  if (hasCommands) await pipeline.exec();
}

async function removeLegacyUserMembers(eventId) {
  const keys = [listKey(eventId), activeKey(eventId)];
  const pipeline = redis.pipeline();
  let hasCommands = false;

  for (const key of keys) {
    const type = await redis.type(key);
    if (type === 'none') continue;
    if (type !== 'zset') {
      pipeline.del(key);
      hasCommands = true;
      continue;
    }

    const members = await redis.zrange(key, 0, -1);
    for (const memberId of members) {
      if (memberId.includes(':')) continue;
      pipeline.zrem(key, memberId);
      pipeline.del(tokenKey(eventId, memberId));
      pipeline.del(waitingKey(eventId, memberId));
      hasCommands = true;
    }
  }

  if (hasCommands) await pipeline.exec();
}

/**
 * Kiểm tra xem user có thể vào seat selection ngay không.
 * Trả về { admitted: true, token } hoặc { admitted: false, position, total, queueId }
 */
async function tryAdmit(eventId, userId, queueSessionId) {
  await cleanupExpiredActive(eventId);

  const memberId = makeMemberId(userId, queueSessionId);
  const token = crypto.randomBytes(16).toString('hex');
  const storedToken = makeTokenValue(userId, token);
  const now = Date.now();
  const expiresAt = now + TOKEN_TTL * 1000;

  // Admission must be atomic because many users can click into the same event at
  // once. The Lua script checks existing token, capacity, active set, and queue
  // insertion in one Redis round-trip.
  const [admitted, issuedToken] = await redis.eval(
    `
      local listKey = KEYS[1]
      local activeKey = KEYS[2]
      local tokenKey = KEYS[3]
      local memberId = ARGV[1]
      local now = tonumber(ARGV[2])
      local expiresAt = tonumber(ARGV[3])
      local capacity = tonumber(ARGV[4])
      local storedToken = ARGV[5]
      local ttl = tonumber(ARGV[6])

      local existingToken = redis.call('GET', tokenKey)
      if existingToken then
        local activeScore = redis.call('ZSCORE', activeKey, memberId)
        if activeScore then
          local separator = string.find(existingToken, ':')
          if separator then
            return {1, string.sub(existingToken, separator + 1)}
          end
          return {1, existingToken}
        end
        redis.call('DEL', tokenKey)
      end

      redis.call('ZREMRANGEBYSCORE', activeKey, '-inf', now)

      local active = redis.call('ZCARD', activeKey)
      if active < capacity then
        redis.call('SET', tokenKey, storedToken, 'EX', ttl)
        redis.call('ZADD', activeKey, expiresAt, memberId)
        redis.call('ZREM', listKey, memberId)
        redis.call('DEL', ARGV[7] .. memberId)
        return {1, string.sub(storedToken, string.find(storedToken, ':') + 1)}
      end

      redis.call('ZADD', listKey, 'NX', now, memberId)
      redis.call('SET', ARGV[7] .. memberId, '1', 'EX', tonumber(ARGV[8]))
      return {0, ''}
    `,
    3,
    listKey(eventId),
    activeKey(eventId),
    tokenKey(eventId, memberId),
    memberId,
    now,
    expiresAt,
    CAPACITY,
    storedToken,
    TOKEN_TTL,
    waitingKeyPrefix(eventId),
    WAITING_TTL
  );

  if (Number(admitted) === 1) {
    return { admitted: true, token: issuedToken };
  }

  const [position, total] = await Promise.all([
    redis.zrank(listKey(eventId), memberId),   // 0-based rank
    redis.zcard(listKey(eventId)),
  ]);

  return {
    admitted: false,
    position: position !== null ? position + 1 : total, // 1-based
    total,
    queueId: `vq-${eventId}-${userId}`,
  };
}

/**
 * Kiểm tra trạng thái của user trong hàng chờ.
 * Nếu user đã được admit (có token), trả về token.
 */
async function getStatus(eventId, userId, queueSessionId) {
  await cleanupExpiredActive(eventId);

  const memberId = makeMemberId(userId, queueSessionId);
  const admittedCount = await drainQueue(eventId);
  if (admittedCount > 0) {
    emitQueueUpdated(eventId);
  }

  // Kiểm tra xem đã có token chưa
  const [token, activeScore] = await Promise.all([
    redis.get(tokenKey(eventId, memberId)),
    redis.zscore(activeKey(eventId), memberId),
  ]);
  if (token && activeScore) {
    const parsed = readTokenValue(token);
    if (parsed && (!parsed.userId || parsed.userId === userId)) {
      return { admitted: true, token: parsed.token };
    }
  }
  if (token && !activeScore) {
    await redis.del(tokenKey(eventId, memberId));
  }

  // Kiểm tra có trong queue không
  const [rank, total] = await Promise.all([
    redis.zrank(listKey(eventId), memberId),
    redis.zcard(listKey(eventId)),
  ]);

  if (rank === null) {
    // Không trong queue, không có token → thử admit lại
    return {
      admitted: false,
      position: null,
      total,
    };
  }

  await redis.set(waitingKey(eventId, memberId), '1', 'EX', WAITING_TTL);

  return {
    admitted: false,
    position: rank + 1,
    total,
  };
}

/**
 * User rời seat selection (checkout xong hoặc timeout) → giải phóng slot.
 * Sau đó drain queue để admit batch tiếp theo.
 */
async function releaseSlot(eventId, userId, queueSessionId) {
  await cleanupExpiredActive(eventId);

  const memberId = makeMemberId(userId, queueSessionId);
  await Promise.all([
    redis.del(tokenKey(eventId, memberId)),
    redis.del(tokenKey(eventId, userId)),
    redis.del(waitingKey(eventId, memberId)),
    redis.del(waitingKey(eventId, userId)),
    redis.zrem(listKey(eventId), memberId),
    redis.zrem(listKey(eventId), userId),
    redis.zrem(activeKey(eventId), memberId),
    redis.zrem(activeKey(eventId), userId),
  ]);

  await drainQueue(eventId);
  emitQueueUpdated(eventId);
}

/**
 * Admit một batch người dùng tiếp theo từ queue.
 * Được gọi sau releaseSlot hoặc theo interval.
 */
async function drainQueue(eventId) {
  await cleanupExpiredActive(eventId);

  let admittedCount = 0;
  for (let i = 0; i < BATCH; i += 1) {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + TOKEN_TTL * 1000;
    // Each iteration admits at most one live waiting tab. Returning 2 means the
    // queue member was stale, so the loop continues without consuming capacity.
    const admitted = await redis.eval(
      `
        local listKey = KEYS[1]
        local activeKey = KEYS[2]
        local tokenPrefix = ARGV[1]
        local waitingPrefix = ARGV[2]
        local now = tonumber(ARGV[3])
        local expiresAt = tonumber(ARGV[4])
        local capacity = tonumber(ARGV[5])
        local token = ARGV[6]
        local ttl = tonumber(ARGV[7])

        redis.call('ZREMRANGEBYSCORE', activeKey, '-inf', now)
        if redis.call('ZCARD', activeKey) >= capacity then
          return 0
        end

        local nextMembers = redis.call('ZRANGE', listKey, 0, 0)
        if #nextMembers == 0 then
          return 0
        end

        local memberId = nextMembers[1]
        if redis.call('ZREM', listKey, memberId) == 0 then
          return 0
        end
        if redis.call('EXISTS', waitingPrefix .. memberId) == 0 then
          return 2
        end

        local separator = string.find(memberId, ':')
        local uid = separator and string.sub(memberId, 1, separator - 1) or memberId
        redis.call('SET', tokenPrefix .. memberId, uid .. ':' .. token, 'EX', ttl)
        redis.call('ZADD', activeKey, expiresAt, memberId)
        redis.call('DEL', waitingPrefix .. memberId)
        return 1
      `,
      2,
      listKey(eventId),
      activeKey(eventId),
      tokenKeyPrefix(eventId),
      waitingKeyPrefix(eventId),
      Date.now(),
      expiresAt,
      CAPACITY,
      token,
      TOKEN_TTL
    );

    if (Number(admitted) === 2) continue;
    if (Number(admitted) !== 1) break;
    admittedCount += 1;
  }

  return admittedCount;
}

/**
 * Xác thực token khi user thực sự vào trang seat selection.
 */
async function validateToken(eventId, userId, token, queueSessionId) {
  await cleanupExpiredActive(eventId);

  const memberId = makeMemberId(userId, queueSessionId);
  const expiresAt = Date.now() + TOKEN_TTL * 1000;
  const [stored, activeScore] = await Promise.all([
    redis.get(tokenKey(eventId, memberId)),
    redis.zscore(activeKey(eventId), memberId),
  ]);

  if (!activeScore) {
    await redis.del(tokenKey(eventId, memberId));
    return false;
  }

  const parsed = readTokenValue(stored);
  const valid = parsed && parsed.token === token && (!parsed.userId || parsed.userId === userId);
  if (!valid) return false;

  // A valid page visit/heartbeat extends the active slot. Without this renewal,
  // users who are still on the seat page could be evicted by TTL cleanup.
  await Promise.all([
    redis.expire(tokenKey(eventId, memberId), TOKEN_TTL),
    redis.zadd(activeKey(eventId), expiresAt, memberId),
  ]);

  return true;
}

/**
 * Thống kê hàng chờ (dùng cho admin hoặc debug).
 */
async function getQueueStats(eventId) {
  await cleanupExpiredActive(eventId);

  const [active, total] = await Promise.all([
    redis.zcard(activeKey(eventId)),
    redis.zcard(listKey(eventId)),
  ]);
  return {
    active: Number(active) || 0,
    waiting: total,
    capacity: CAPACITY,
  };
}

module.exports = {
  tryAdmit,
  getStatus,
  releaseSlot,
  drainQueue,
  validateToken,
  getQueueStats,
  CAPACITY,
};
