require('dotenv').config();
const app = require('./app');
const http = require('http');
const { initSocket } = require('./config/socket');
const printRoutes = require('./utils/printRoutes');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

initSocket(server);

// Import worker after Socket.IO is initialized so emitSeatEvent is available
require('./jobs/seat.worker');

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  printRoutes(app, PORT);
});