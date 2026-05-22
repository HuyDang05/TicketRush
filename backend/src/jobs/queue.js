require('dotenv').config();
const { Queue } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');

// BullMQ yêu cầu connection instance riêng cho Queue và Worker
const queueConnection = { ...redisConnectionOptions };

const seatReleaseQueue = new Queue('seat-release', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

seatReleaseQueue.on('error', (err) => {
  console.error('[Queue] seat-release error:', err.message);
});

console.log('[Queue] seat-release initialized');

const closeSeatReleaseQueue = () => seatReleaseQueue.close();

module.exports = { seatReleaseQueue, closeSeatReleaseQueue };
