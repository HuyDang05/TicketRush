const { PrismaClient } = require('@prisma/client');
const { seatReleaseQueue } = require('../jobs/queue');
const { emitSeatEvent } = require('../config/socket');

const prisma = new PrismaClient();

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 phút
const MAX_LOCKS_PER_EVENT = 4;

async function lockSeat(userId, seatId) {
  // Bước 0: Kiểm tra ghế tồn tại và lấy thông tin zone/event
  const seat = await prisma.seat.findUnique({
    where: { id: seatId },
    include: {
      zone: {
        include: { event: true },
      },
    },
  });

  if (!seat) {
    const err = new Error('Ghế không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  const { zone } = seat;
  const eventId = zone.eventId;

  // Bước 0b: Kiểm tra giới hạn 4 ghế/event
  const currentLocks = await prisma.booking.count({
    where: {
      userId,
      status: 'PENDING',
      seat: { zone: { eventId } },
    },
  });

  if (currentLocks >= MAX_LOCKS_PER_EVENT) {
    const err = new Error(`Bạn chỉ được giữ tối đa ${MAX_LOCKS_PER_EVENT} ghế trong cùng một sự kiện`);
    err.statusCode = 409;
    throw err;
  }

  // Bước 1-5: Transaction với SELECT FOR UPDATE
  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE — block transaction khác trên row này
      const [lockedSeat] = await tx.$queryRaw`
        SELECT id, status FROM seats WHERE id = ${seatId} FOR UPDATE
      `;

      if (!lockedSeat || lockedSeat.status !== 'AVAILABLE') {
        const err = new Error('Ghế vừa được người khác chọn');
        err.statusCode = 409;
        throw err;
      }

      // Cập nhật ghế → LOCKED
      await tx.seat.update({
        where: { id: seatId },
        data: { status: 'LOCKED', lockedAt: new Date() },
      });

      // Tạo Booking PENDING
      return tx.booking.create({
        data: {
          userId,
          seatId,
          status: 'PENDING',
          totalPrice: zone.price,
        },
        include: {
          seat: {
            include: {
              zone: {
                include: { event: true },
              },
            },
          },
        },
      });
    });
  } catch (err) {
    // Re-throw lỗi từ trong transaction (409) hoặc DB error
    if (!err.statusCode) err.statusCode = 500;
    throw err;
  }

  // Bước 6: Enqueue BullMQ job (ngoài transaction)
  const job = await seatReleaseQueue.add(
    'release-seat',
    { bookingId: booking.id, seatId },
    { delay: LOCK_DURATION_MS }
  );

  // Lưu jobId vào booking
  await prisma.booking.update({
    where: { id: booking.id },
    data: { jobId: job.id.toString() },
  });

  // Bước 7: Broadcast seat_locked qua Socket.IO
  try {
    emitSeatEvent(eventId, 'seat_locked', {
      seatId,
      label: seat.label,
    });
  } catch {
    // Socket lỗi không ảnh hưởng response
  }

  const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);

  return {
    bookingId: booking.id,
    seatId,
    seatLabel: seat.label,
    zoneName: zone.name,
    totalPrice: Number(zone.price),
    status: booking.status,
    expiresAt,
    createdAt: booking.createdAt,
  };
}

module.exports = { lockSeat };
