require('dotenv').config();
const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { redisConnectionOptions } = require('../config/redis');
const { emitSeatEvent } = require('../config/socket');

const prisma = new PrismaClient();

// BullMQ requires a separate connection instance from the Queue
const workerConnection = { ...redisConnectionOptions };

const seatWorker = new Worker(
  'seat-release',
  async (job) => {
    const { bookingId, seatId } = job.data;
    console.log(`[Worker] job ${job.id} — releasing seat ${seatId} for booking ${bookingId}`);

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          seat: {
            include: { zone: true },
          },
        },
      });

      // Idempotent: if already PAID or CANCELLED (or missing), do nothing
      if (!booking || booking.status !== 'PENDING') {
        console.log(`[Worker] job ${job.id} skipped — booking status: ${booking?.status ?? 'not found'}`);
        return;
      }

      const eventId = booking.seat.zone.eventId;
      const seatLabel = booking.seat.label;

      await prisma.$transaction([
        prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED' },
        }),
        prisma.seat.update({
          where: { id: seatId },
          data: { status: 'AVAILABLE', lockedAt: null },
        }),
      ]);

      console.log(`[Worker] job ${job.id} done — seat ${seatId} (${seatLabel}) released`);

      try {
        emitSeatEvent(eventId, 'seat_released', { seatId, label: seatLabel });
      } catch {
        // Socket failure must not cause job retry
      }
    } catch (err) {
      console.error(`[Worker] job ${job.id} error:`, err.message);
      throw err; // re-throw so BullMQ retries per defaultJobOptions
    }
  },
  { connection: workerConnection }
);

seatWorker.on('completed', (job) => {
  console.log(`[Worker] job ${job.id} completed`);
});

seatWorker.on('failed', (job, err) => {
  console.error(`[Worker] job ${job?.id} failed:`, err.message);
});

console.log('[Worker] seat-release worker started');

module.exports = { seatWorker };
