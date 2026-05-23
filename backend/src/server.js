// Purpose: File code TicketRush; doc comment gan logic ben duoi de nam vai tro va luong xu ly.
require('dotenv').config();
const app = require('./app');
const http = require('http');
const { closeSocket, initSocket } = require('./config/socket');
const printRoutes = require('./utils/printRoutes');
const { closeSeatReleaseQueue } = require('./jobs/queue');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

initSocket(server);

// Import worker after Socket.IO is initialized so emitSeatEvent is available
const { closeSeatWorker } = require('./jobs/seat.worker');

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is already in use. Stop the existing backend process or set a different PORT in .env.`);
    process.exit(1);
  }

  throw error;
});

let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Server] ${signal} received, shutting down...`);

  const forceExit = setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);

  try {
    await Promise.allSettled([
      closeSocket(),
      closeSeatWorker(),
      closeSeatReleaseQueue(),
    ]);

    if (server.closeAllConnections) {
      server.closeAllConnections();
    }

    await new Promise((resolve) => server.close(resolve));
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExit);
    console.error('[Server] Shutdown error:', error);
    process.exit(1);
  }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGUSR2', () => shutdown('SIGUSR2'));

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  printRoutes(app, PORT);
});
