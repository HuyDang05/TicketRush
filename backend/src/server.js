require('dotenv').config();
const app = require('./app');
const http = require('http');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
});
