require('dotenv').config();
const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { redisConnectionOptions } = require('../config/redis');
const { emitSeatEvent } = require('../config/socket');
const { seatReleaseQueue } = require('./queue');

const prisma = new PrismaClient();

const LOCK_DURATION_MS = 10 * 60 * 1000;

// Shared helper — release one booking+seat atomically and emit socket event
async function releaseSeat(bookingId, seatId, jobId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seat: { include: { zone: true } } },
  });

  if (!booking || booking.status !== 'PENDING') {
    console.log(`[Worker] job ${jobId} skipped — booking status: ${booking?.status ?? 'not found'}`);
    return;
  }

  const eventId   = booking.seat.zone.eventId;
  const seatLabel = booking.seat.label;

  await prisma.$transaction([
    prisma.booking.delete({
      where: { id: bookingId },
    }),
    prisma.seat.update({
      where: { id: seatId },
      data:  { status: 'AVAILABLE', lockedAt: null },
    }),
  ]);

  console.log(`[Worker] job ${jobId} done — seat ${seatId} (${seatLabel}) released`);

  try {
    emitSeatEvent(eventId, 'seat_released', { seatId, label: seatLabel });
  } catch {
    // Socket failure must not cause job retry
  }
}

// ── Worker xử lý 2 loại job ───────────────────────────────────────────────────
const seatWorker = new Worker(
  'seat-release',
  async (job) => {
    // Job định danh qua tên
    if (job.name === 'cleanup-stale-seats') {
      await runCleanup(job.id);
      return;
    }

    // Job thông thường: release đúng 1 ghế sau 10 phút
    const { bookingId, seatId } = job.data;
    console.log(`[Worker] job ${job.id} — releasing seat ${seatId} for booking ${bookingId}`);
    try {
      await releaseSeat(bookingId, seatId, job.id);
    } catch (err) {
      console.error(`[Worker] job ${job.id} error:`, err.message);
      throw err; // re-throw → BullMQ retry theo defaultJobOptions
    }
  },
  { connection: { ...redisConnectionOptions } }
);

// ── Cleanup scanner: quét DB tìm ghế bị stuck (Redis job mất) ────────────────
// Chạy mỗi 2 phút qua BullMQ repeatable job
async function runCleanup(jobId) {
  const cutoff = new Date(Date.now() - LOCK_DURATION_MS);

  // Tìm tất cả booking PENDING có lockedAt quá 10 phút
  const staleBookings = await prisma.booking.findMany({
    where: {
      status: 'PENDING',
      seat: {
        status:   'LOCKED',
        lockedAt: { lt: cutoff },
      },
    },
    include: { seat: true },
  });

  if (staleBookings.length === 0) {
    console.log(`[Cleanup] job ${jobId} — no stale seats found`);
    return;
  }

  console.log(`[Cleanup] job ${jobId} — found ${staleBookings.length} stale booking(s), releasing...`);

  await Promise.allSettled(
    staleBookings.map(b => releaseSeat(b.id, b.seatId, `cleanup-${jobId}`))
  );
}

// Đăng ký repeatable job khi worker khởi động
async function scheduleCleanup() {
  await seatReleaseQueue.add(
    'cleanup-stale-seats',
    {},
    {
      repeat: { every: 2 * 60 * 1000 }, // mỗi 2 phút
      jobId:  'cleanup-stale-seats',    // stable ID tránh tạo duplicate
    }
  );
  console.log('[Worker] cleanup-stale-seats scheduled (every 2 min)');
}

scheduleCleanup().catch(err =>
  console.error('[Worker] failed to schedule cleanup:', err.message)
);

// ── Event listeners ───────────────────────────────────────────────────────────
seatWorker.on('completed', (job) => {
  if (job.name !== 'cleanup-stale-seats') {
    console.log(`[Worker] job ${job.id} completed`);
  }
});

seatWorker.on('failed', (job, err) => {
  console.error(`[Worker] job ${job?.id} failed:`, err.message);
});

console.log('[Worker] seat-release worker started');

module.exports = { seatWorker };
