// Purpose: Cau hinh ket noi dich vu ha tang nhu Prisma, Redis, Socket, upload hoac Swagger.
const { Server } = require('socket.io');

let io = null;

/**
 * Khởi tạo Socket.IO gắn vào HTTP server.
 * Phải gọi hàm này một lần duy nhất trong server.js trước khi dùng getIO().
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3001',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('join_event', (eventId) => {
      socket.join(`event:${eventId}`);
      console.log(`[Socket] ${socket.id} joined room event:${eventId}`);
    });

    socket.on('leave_event', (eventId) => {
      socket.leave(`event:${eventId}`);
      console.log(`[Socket] ${socket.id} left room event:${eventId}`);
    });

    // Soft-select relay: broadcast to everyone else in the room, not back to sender
    socket.on('seat_selecting', ({ eventId, seatId }) => {
      if (!eventId || !seatId) return;
      socket.to(`event:${eventId}`).emit('seat_selecting', { seatId });
    });

    socket.on('seat_deselecting', ({ eventId, seatId }) => {
      if (!eventId || !seatId) return;
      socket.to(`event:${eventId}`).emit('seat_deselecting', { seatId });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Trả về io instance đã được khởi tạo.
 * Dùng trong service để broadcast mà không cần truyền io qua parameter.
 */
function getIO() {
  if (!io) throw new Error('Socket.IO chưa được khởi tạo — gọi initSocket(server) trước');
  return io;
}

/**
 * Broadcast seat events tới room của event.
 *
 * Events chuẩn:
 *   seat_locked   — ghế vừa bị lock (đang chọn)
 *   seat_sold     — ghế vừa được thanh toán
 *   seat_released — ghế vừa được giải phóng (hết timeout hoặc huỷ)
 *
 * Payload: { seatId, label }
 */
function emitSeatEvent(eventId, eventName, payload) {
  getIO().to(`event:${eventId}`).emit(eventName, payload);
}

function closeSocket() {
  if (!io) return Promise.resolve();

  return new Promise((resolve) => {
    io.close(() => {
      io = null;
      resolve();
    });
  });
}

module.exports = { initSocket, getIO, emitSeatEvent, closeSocket };
