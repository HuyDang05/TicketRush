require('dotenv').config();
const { Worker } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');

// Worker dùng connection instance riêng — tách khỏi Queue instance
const workerConnection = { ...redisConnectionOptions };

const seatWorker = new Worker(
  'seat-release',
  async (job) => {
    const { bookingId, seatId } = job.data;
    console.log(`[Worker] Processing job ${job.id}: release seat ${seatId} for booking ${bookingId}`);

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

      if (!booking || booking.status !== 'PENDING') {
        console.log(`[Worker] Job ${job.id} skipped — booking not pending`);
        return;
      }

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

      console.log(`[Worker] Job ${job.id} done — seat ${seatId} released`);
    } finally {
      await prisma.$disconnect();
    }
  },
  { connection: workerConnection }
);

seatWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

seatWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

console.log('[Worker] seat-release worker started');

module.exports = { seatWorker };
