/**
 * Virtual Queue Service
 *
 * Dùng Redis để quản lý hàng chờ ảo khi lưu lượng vượt ngưỡng DB.
 *
 * Cấu trúc Redis:
 *   vq:{eventId}:list        — Sorted Set, score = timestamp join, member = userId
 *   vq:{eventId}:token:{uid} — String, token cấp quyền vào seat selection
 *   vq:{eventId}:active      — Number, số user đang trong seat selection
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
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

const CAPACITY = Number(process.env.QUEUE_CAPACITY) || 50;   // số slot đồng thời
const BATCH    = Number(process.env.QUEUE_BATCH)    || 50;   // user/lượt admit
const TOKEN_TTL = 5 * 60;                                    // token sống 5 phút (giây)

function listKey(eventId)        { return `vq:${eventId}:list`; }
function activeKey(eventId)      { return `vq:${eventId}:active`; }
function tokenKey(eventId, uid)  { return `vq:${eventId}:token:${uid}`; }

/**
 * Kiểm tra xem user có thể vào seat selection ngay không.
 * Trả về { admitted: true, token } hoặc { admitted: false, position, total, queueId }
 */
async function tryAdmit(eventId, userId) {
  const active = Number(await redis.get(activeKey(eventId))) || 0;

  if (active < CAPACITY) {
    // Có slot trống — cấp token ngay
    const token = crypto.randomBytes(16).toString('hex');
    await Promise.all([
      redis.incr(activeKey(eventId)),
      redis.set(tokenKey(eventId, userId), token, 'EX', TOKEN_TTL),
      // Đảm bảo user không nằm trong queue nếu đã được admit
      redis.zrem(listKey(eventId), userId),
    ]);
    return { admitted: true, token };
  }

  // Hết slot — enqueue (nếu chưa có)
  const alreadyInQueue = await redis.zscore(listKey(eventId), userId);
  if (!alreadyInQueue) {
    await redis.zadd(listKey(eventId), 'NX', Date.now(), userId);
  }

  const [position, total] = await Promise.all([
    redis.zrank(listKey(eventId), userId),   // 0-based rank
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
async function getStatus(eventId, userId) {
  // Kiểm tra xem đã có token chưa
  const token = await redis.get(tokenKey(eventId, userId));
  if (token) {
    return { admitted: true, token };
  }

  // Kiểm tra có trong queue không
  const [rank, total] = await Promise.all([
    redis.zrank(listKey(eventId), userId),
    redis.zcard(listKey(eventId)),
  ]);

  if (rank === null) {
    // Không trong queue, không có token → thử admit lại
    return tryAdmit(eventId, userId);
  }

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
async function releaseSlot(eventId, userId) {
  await Promise.all([
    redis.del(tokenKey(eventId, userId)),
    redis.decr(activeKey(eventId)),
  ]);
  // Đảm bảo active không âm
  const active = Number(await redis.get(activeKey(eventId)));
  if (active < 0) await redis.set(activeKey(eventId), 0);

  await drainQueue(eventId);
}

/**
 * Admit một batch người dùng tiếp theo từ queue.
 * Được gọi sau releaseSlot hoặc theo interval.
 */
async function drainQueue(eventId) {
  const active = Number(await redis.get(activeKey(eventId))) || 0;
  const available = Math.max(0, CAPACITY - active);
  if (available === 0) return;

  const toAdmit = Math.min(available, BATCH);
  const candidates = await redis.zrange(listKey(eventId), 0, toAdmit - 1);

  for (const uid of candidates) {
    const token = crypto.randomBytes(16).toString('hex');
    await Promise.all([
      redis.set(tokenKey(eventId, uid), token, 'EX', TOKEN_TTL),
      redis.zrem(listKey(eventId), uid),
      redis.incr(activeKey(eventId)),
    ]);
  }
}

/**
 * Xác thực token khi user thực sự vào trang seat selection.
 */
async function validateToken(eventId, userId, token) {
  const stored = await redis.get(tokenKey(eventId, userId));
  return stored === token;
}

/**
 * Thống kê hàng chờ (dùng cho admin hoặc debug).
 */
async function getQueueStats(eventId) {
  const [active, total] = await Promise.all([
    redis.get(activeKey(eventId)),
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
