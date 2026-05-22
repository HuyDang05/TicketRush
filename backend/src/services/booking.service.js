const { PrismaClient } = require('@prisma/client');
const { seatReleaseQueue } = require('../jobs/queue');
const { emitSeatEvent } = require('../config/socket');
const { validateToken } = require('./queue.service');

const prisma = new PrismaClient();

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 phút
const MAX_LOCKS_PER_EVENT = 4;

async function lockSeat(userId, seatId, socketId, queueToken, queueSessionId) {
  const seatForQueue = await prisma.seat.findUnique({
    where: { id: seatId },
    select: {
      zone: {
        select: { eventId: true },
      },
    },
  });

  if (!seatForQueue) {
    const err = new Error('Ghế không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  const queueAllowed = queueToken
    ? await validateToken(seatForQueue.zone.eventId, userId, queueToken, queueSessionId)
    : false;

  if (!queueAllowed) {
    const err = new Error('Bạn chưa đến lượt chọn ghế. Vui lòng vào lại từ trang sự kiện.');
    err.statusCode = 403;
    throw err;
  }

  // Toàn bộ validation + mutation trong 1 transaction duy nhất với SERIALIZABLE
  // để tránh race condition khi nhiều user cùng click 1 ghế
  let booking;
  let seat;
  let eventId;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. SELECT FOR UPDATE trên ghế — block mọi transaction khác đang cố lock cùng row
      const [lockedSeat] = await tx.$queryRaw`
        SELECT id, status, "zoneId", label FROM seats WHERE id = ${seatId} FOR UPDATE
      `;

      if (!lockedSeat) {
        const err = new Error('Ghế không tồn tại');
        err.statusCode = 404;
        throw err;
      }

      if (lockedSeat.status !== 'AVAILABLE') {
        const err = new Error('Ghế vừa được người khác chọn');
        err.statusCode = 409;
        throw err;
      }

      // 2. Lấy zone/event (sau khi đã giữ lock ghế)
      const zone = await tx.zone.findUnique({
        where: { id: lockedSeat.zoneId },
        include: { event: true },
      });

      if (!zone) {
        const err = new Error('Khu vực không tồn tại');
        err.statusCode = 404;
        throw err;
      }

      const eventId = zone.eventId;

      // 3. Kiểm tra giới hạn 4 ghế/event — bên trong transaction để đếm chính xác
      const [{ count }] = await tx.$queryRaw`
        SELECT COUNT(*) AS count
        FROM bookings b
        JOIN seats s ON s.id = b."seatId"
        JOIN zones z ON z.id = s."zoneId"
        WHERE b."userId" = ${userId}
          AND b.status = 'PENDING'
          AND z."eventId" = ${eventId}
      `;

      if (Number(count) >= MAX_LOCKS_PER_EVENT) {
        const err = new Error(`Bạn chỉ được giữ tối đa ${MAX_LOCKS_PER_EVENT} ghế trong cùng một sự kiện`);
        err.statusCode = 409;
        throw err;
      }

      // 4. Cập nhật ghế → LOCKED
      await tx.seat.update({
        where: { id: seatId },
        data: { status: 'LOCKED', lockedAt: new Date() },
      });

      // 5. Tạo Booking PENDING — seatId là UNIQUE nên DB cũng chặn duplicate
      const newBooking = await tx.booking.create({
        data: {
          userId,
          seatId,
          status: 'PENDING',
          totalPrice: zone.price,
        },
      });

      return { booking: newBooking, zone, eventId, seatLabel: lockedSeat.label };
    });

    booking = result.booking;
    seat = { label: result.seatLabel, zone: result.zone };
    eventId = result.eventId;
  } catch (err) {
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

  const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);

  // Bước 7: Broadcast seat_locked qua Socket.IO
  try {
    emitSeatEvent(eventId, 'seat_locked', {
      seatId,
      label: seat.label,
      userId,
      bookingId: booking.id,
      expiresAt,
      zoneId: seat.zone.id,
      zoneName: seat.zone.name,
      totalPrice: Number(seat.zone.price),
      socketId: socketId ?? null,
    });
  } catch {
    // Socket lỗi không ảnh hưởng response
  }

  return {
    bookingId: booking.id,
    seatId,
    seatLabel: seat.label,
    zoneName: seat.zone.name,
    totalPrice: Number(seat.zone.price),
    status: booking.status,
    expiresAt,
    createdAt: booking.createdAt,
  };
}

async function getMyTickets(userId) {
  const tickets = await prisma.booking.findMany({
    where: {
      userId,
      status: 'PAID',
    },
    orderBy: {
      paidAt: 'desc',
    },
    include: {
      seat: {
        include: {
          zone: {
            include: {
              event: true,
            },
          },
        },
      },
    },
  });

  return tickets.map((booking) => {
    const event = booking.seat.zone.event;

    return {
      id: booking.id,
      bookingId: booking.id,
      status: booking.status,
      qrCode: booking.qrCode,
      paidAt: booking.paidAt,

      seatName: booking.seat.label,
      zoneName: booking.seat.zone.name,

      price: Number(booking.totalPrice),
      totalPrice: Number(booking.totalPrice),

      eventName: event.title,
      eventTitle: event.title,
      location: event.venue,
      eventDate: event.date,
      eventEndDate: event.endDate,
      imageUrl: event.cardImageUrl || event.imageUrl,
    };
  });
}

async function releaseSeatUser(userId, bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seat: { include: { zone: true } } },
  });

  if (!booking) {
    const err = new Error('Không tìm thấy thông tin đặt chỗ');
    err.statusCode = 404;
    throw err;
  }

  if (booking.userId !== userId) {
    const err = new Error('Không có quyền thực hiện thao tác này');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status !== 'PENDING') {
    const err = new Error('Ghế không ở trạng thái đang khóa');
    err.statusCode = 400;
    throw err;
  }

  const eventId = booking.seat.zone.eventId;
  const seatId = booking.seatId;
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

  try {
    emitSeatEvent(eventId, 'seat_released', { seatId, label: seatLabel });
  } catch {
    // Socket failure
  }

  return { success: true, message: 'Đã hủy giữ chỗ thành công' };
}

async function getMyPendingLocks(userId, eventId) {
  const whereCondition = {
    userId,
    status: 'PENDING',
  };
  
  if (eventId) {
    whereCondition.seat = {
      zone: {
        eventId
      }
    };
  }

  const pendingBookings = await prisma.booking.findMany({
    where: whereCondition,
    include: {
      seat: {
        include: {
          zone: {
            include: {
              event: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return pendingBookings.map((b) => {
    const baseTime = b.seat.lockedAt ? b.seat.lockedAt.getTime() : b.createdAt.getTime();
    const expiresAt = new Date(baseTime + LOCK_DURATION_MS);
    return {
      bookingId: b.id,
      seatId: b.seatId,
      seatLabel: b.seat.label,
      row: b.seat.row,
      col: b.seat.col,
      zoneId: b.seat.zoneId,
      zoneName: b.seat.zone.name,
      eventId: b.seat.zone.eventId,
      eventTitle: b.seat.zone.event.title,
      eventImageUrl: b.seat.zone.event.cardImageUrl || b.seat.zone.event.imageUrl,
      totalPrice: Number(b.totalPrice),
      status: b.status,
      expiresAt: expiresAt,
      createdAt: b.createdAt
    };
  });
}

module.exports = {
  lockSeat,
  getMyTickets,
  releaseSeatUser,
  getMyPendingLocks,
};
