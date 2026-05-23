// Purpose: Cau hinh job nen de xu ly tac vu bat dong bo lien quan den ghe/queue.
require('dotenv').config();
const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { redisConnectionOptions } = require('../config/redis');
const { emitSeatEvent } = require('../config/socket');
const { seatReleaseQueue } = require('./queue');

const prisma = new PrismaClient();

const LOCK_DURATION_MS = 10 * 60 * 1000;
const HOLD_COOLDOWN_MS = 5 * 60 * 1000;

async function releaseSeat(bookingId, seatId, jobId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seat: { include: { zone: true } } },
  });

  if (!booking || booking.status !== 'PENDING') {
    console.log(`[Worker] job ${jobId} skipped - booking status: ${booking?.status ?? 'not found'}`);
    return;
  }

  const eventId = booking.seat.zone.eventId;
  const seatLabel = booking.seat.label;

  await prisma.$transaction([
    prisma.booking.delete({
      where: { id: bookingId },
    }),
    prisma.seat.update({
      where: { id: seatId },
      data: { status: 'AVAILABLE', lockedAt: null },
    }),
  ]);

  console.log(`[Worker] job ${jobId} done - legacy seat ${seatId} (${seatLabel}) released`);

  try {
    emitSeatEvent(eventId, 'seat_released', { seatId, label: seatLabel });
  } catch {
    // Socket failure must not cause job retry
  }
}

async function releaseSession(sessionId, jobId) {
  const session = await prisma.seatHoldSession.findUnique({
    where: { id: sessionId },
    include: {
      bookings: {
        where: { status: 'PENDING' },
        include: { seat: { include: { zone: true } } },
      },
    },
  });

  if (!session || session.status !== 'ACTIVE') {
    console.log(`[Worker] job ${jobId} skipped - hold session status: ${session?.status ?? 'not found'}`);
    return;
  }

  const now = Date.now();
  if (session.expiresAt.getTime() > now) {
    const delay = Math.max(0, session.expiresAt.getTime() - now);
    const nextJob = await seatReleaseQueue.add(
      'release-session',
      { sessionId },
      { delay }
    );
    await prisma.seatHoldSession.update({
      where: { id: sessionId },
      data: { jobId: nextJob.id.toString() },
    });
    console.log(`[Worker] job ${jobId} rescheduled - hold session ${sessionId} is not expired yet`);
    return;
  }

  const bookingIds = session.bookings.map((booking) => booking.id);
  const seatIds = session.bookings.map((booking) => booking.seatId);
  const cooldownUntil = new Date(now + HOLD_COOLDOWN_MS);

  await prisma.$transaction(async (tx) => {
    if (seatIds.length > 0) {
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: 'AVAILABLE', lockedAt: null },
      });
    }

    if (bookingIds.length > 0) {
      await tx.booking.deleteMany({
        where: { id: { in: bookingIds } },
      });
    }

    await tx.seatHoldSession.update({
      where: { id: sessionId },
      data: {
        status: 'EXPIRED',
        cooldownUntil,
      },
    });
  });

  console.log(`[Worker] job ${jobId} done - hold session ${sessionId} expired, ${seatIds.length} seat(s) released`);

  for (const booking of session.bookings) {
    try {
      emitSeatEvent(session.eventId, 'seat_released', {
        seatId: booking.seatId,
        label: booking.seat.label,
        holdSessionId: session.id,
        cooldownUntil,
      });
    } catch {
      // Socket failure must not cause job retry
    }
  }
}

const seatWorker = new Worker(
  'seat-release',
  async (job) => {
    if (job.name === 'cleanup-stale-seats') {
      await runCleanup(job.id);
      return;
    }

    if (job.name === 'release-session') {
      await releaseSession(job.data.sessionId, job.id);
      return;
    }

    const { bookingId, seatId } = job.data;
    console.log(`[Worker] job ${job.id} - releasing legacy seat ${seatId} for booking ${bookingId}`);
    await releaseSeat(bookingId, seatId, job.id);
  },
  { connection: { ...redisConnectionOptions } }
);

async function runCleanup(jobId) {
  const now = new Date();
  const staleSessions = await prisma.seatHoldSession.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: now },
    },
    select: { id: true },
  });

  if (staleSessions.length > 0) {
    console.log(`[Cleanup] job ${jobId} - found ${staleSessions.length} stale hold session(s)`);
    await Promise.allSettled(
      staleSessions.map((session) => releaseSession(session.id, `cleanup-${jobId}`))
    );
  }

  const cutoff = new Date(Date.now() - LOCK_DURATION_MS);
  const staleLegacyBookings = await prisma.booking.findMany({
    where: {
      holdSessionId: null,
      status: 'PENDING',
      seat: {
        status: 'LOCKED',
        lockedAt: { lt: cutoff },
      },
    },
    include: { seat: true },
  });

  if (staleLegacyBookings.length === 0 && staleSessions.length === 0) {
    console.log(`[Cleanup] job ${jobId} - no stale seats found`);
    return;
  }

  if (staleLegacyBookings.length > 0) {
    console.log(`[Cleanup] job ${jobId} - found ${staleLegacyBookings.length} stale legacy booking(s)`);
    await Promise.allSettled(
      staleLegacyBookings.map((booking) => releaseSeat(booking.id, booking.seatId, `cleanup-${jobId}`))
    );
  }
}

async function scheduleCleanup() {
  await seatReleaseQueue.add(
    'cleanup-stale-seats',
    {},
    {
      repeat: { every: 2 * 60 * 1000 },
      jobId: 'cleanup-stale-seats',
    }
  );
  console.log('[Worker] cleanup-stale-seats scheduled (every 2 min)');
}

scheduleCleanup().catch((err) =>
  console.error('[Worker] failed to schedule cleanup:', err.message)
);

seatWorker.on('completed', (job) => {
  if (job.name !== 'cleanup-stale-seats') {
    console.log(`[Worker] job ${job.id} completed`);
  }
});

seatWorker.on('failed', (job, err) => {
  console.error(`[Worker] job ${job?.id} failed:`, err.message);
});

console.log('[Worker] seat-release worker started');

const closeSeatWorker = async () => {
  await seatWorker.close();
  await prisma.$disconnect();
};

module.exports = { seatWorker, closeSeatWorker };
