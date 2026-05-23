// Purpose: Service chua nghiep vu chinh cua backend, tach khoi controller de de test va tai su dung.
const { PrismaClient } = require('@prisma/client');
const { seatReleaseQueue } = require('../jobs/queue');
const { emitSeatEvent } = require('../config/socket');
const { validateToken } = require('./queue.service');

const prisma = new PrismaClient();

const LOCK_DURATION_MS = 10 * 60 * 1000;
const HOLD_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_LOCKS_PER_EVENT = 4;

function createHttpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function getLegacyExpiresAt(booking) {
  const baseTime = booking.seat?.lockedAt
    ? booking.seat.lockedAt.getTime()
    : booking.createdAt.getTime();
  return new Date(baseTime + LOCK_DURATION_MS);
}

function getBookingExpiresAt(booking) {
  return booking.holdSession?.expiresAt || getLegacyExpiresAt(booking);
}

function createCooldownResult(cooldownUntil, releasedSeats = [], eventId = null) {
  const waitSeconds = Math.max(1, Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000));
  return {
    blocked: true,
    statusCode: 429,
    message: `Phien giu ghe vua het han. Vui long doi ${Math.ceil(waitSeconds / 60)} phut roi thu lai.`,
    cooldownUntil,
    releasedSeats,
    eventId,
  };
}

async function scheduleSessionRelease(sessionId, expiresAt) {
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  const job = await seatReleaseQueue.add(
    'release-session',
    { sessionId },
    { delay }
  );

  await prisma.seatHoldSession.update({
    where: { id: sessionId },
    data: { jobId: job.id.toString() },
  });
}

async function expireSessionInTransaction(tx, sessionId, cooldownUntil) {
  const pendingBookings = await tx.booking.findMany({
    where: {
      holdSessionId: sessionId,
      status: 'PENDING',
    },
    select: {
      id: true,
      seatId: true,
      seat: {
        select: { label: true },
      },
    },
  });

  const bookingIds = pendingBookings.map((booking) => booking.id);
  const seatIds = pendingBookings.map((booking) => booking.seatId);

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

  return pendingBookings.map((booking) => ({
    seatId: booking.seatId,
    label: booking.seat?.label,
  }));
}

async function getOrCreateHoldSession(tx, userId, eventId) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}), hashtext(${userId}))`;

  const now = new Date();
  const [existingSession] = await tx.$queryRaw`
    SELECT id, status, "expiresAt", "cooldownUntil", "jobId"
    FROM seat_hold_sessions
    WHERE "userId" = ${userId}
      AND "eventId" = ${eventId}
      AND status IN ('ACTIVE'::"HoldSessionStatus", 'EXPIRED'::"HoldSessionStatus")
    ORDER BY "createdAt" DESC
    LIMIT 1
    FOR UPDATE
  `;

  if (existingSession?.status === 'ACTIVE') {
    const expiresAt = new Date(existingSession.expiresAt);
    if (expiresAt.getTime() > now.getTime()) {
      return {
        session: {
          id: existingSession.id,
          expiresAt,
          jobId: existingSession.jobId,
        },
        created: false,
      };
    }

    const cooldownUntil = new Date(now.getTime() + HOLD_COOLDOWN_MS);
    const releasedSeats = await expireSessionInTransaction(tx, existingSession.id, cooldownUntil);
    return createCooldownResult(cooldownUntil, releasedSeats, eventId);
  }

  if (existingSession?.cooldownUntil) {
    const cooldownUntil = new Date(existingSession.cooldownUntil);
    if (cooldownUntil.getTime() > now.getTime()) {
      return createCooldownResult(cooldownUntil, [], eventId);
    }
  }

  const session = await tx.seatHoldSession.create({
    data: {
      userId,
      eventId,
      expiresAt: new Date(now.getTime() + LOCK_DURATION_MS),
    },
    select: {
      id: true,
      expiresAt: true,
      jobId: true,
    },
  });

  return { session, created: true };
}

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
    throw createHttpError('Ghe khong ton tai', 404);
  }

  const queueAllowed = queueToken
    ? await validateToken(seatForQueue.zone.eventId, userId, queueToken, queueSessionId)
    : false;

  if (!queueAllowed) {
    throw createHttpError('Ban chua den luot chon ghe. Vui long vao lai tu trang su kien.', 403);
  }

  const result = await prisma.$transaction(async (tx) => {
    const [lockedSeat] = await tx.$queryRaw`
      SELECT id, status, "zoneId", label FROM seats WHERE id = ${seatId} FOR UPDATE
    `;

    if (!lockedSeat) {
      throw createHttpError('Ghe khong ton tai', 404);
    }

    if (lockedSeat.status !== 'AVAILABLE') {
      throw createHttpError('Ghe vua duoc nguoi khac chon', 409);
    }

    const zone = await tx.zone.findUnique({
      where: { id: lockedSeat.zoneId },
      include: { event: true },
    });

    if (!zone) {
      throw createHttpError('Khu vuc khong ton tai', 404);
    }

    const sessionResult = await getOrCreateHoldSession(tx, userId, zone.eventId);
    if (sessionResult.blocked) {
      return sessionResult;
    }

    const [{ count }] = await tx.$queryRaw`
      SELECT COUNT(*) AS count
      FROM bookings b
      JOIN seats s ON s.id = b."seatId"
      JOIN zones z ON z.id = s."zoneId"
      WHERE b."userId" = ${userId}
        AND b.status = 'PENDING'
        AND z."eventId" = ${zone.eventId}
    `;

    if (Number(count) >= MAX_LOCKS_PER_EVENT) {
      throw createHttpError(`Ban chi duoc giu toi da ${MAX_LOCKS_PER_EVENT} ghe trong cung mot su kien`, 409);
    }

    await tx.seat.update({
      where: { id: seatId },
      data: { status: 'LOCKED', lockedAt: new Date() },
    });

    const booking = await tx.booking.create({
      data: {
        userId,
        seatId,
        holdSessionId: sessionResult.session.id,
        status: 'PENDING',
        totalPrice: zone.price,
      },
    });

    return {
      booking,
      zone,
      eventId: zone.eventId,
      seatLabel: lockedSeat.label,
      sessionId: sessionResult.session.id,
      sessionExpiresAt: sessionResult.session.expiresAt,
      createdSession: sessionResult.created,
    };
  });

  if (result.blocked) {
    if (result.eventId && Array.isArray(result.releasedSeats)) {
      for (const releasedSeat of result.releasedSeats) {
        try {
          emitSeatEvent(result.eventId, 'seat_released', {
            ...releasedSeat,
            cooldownUntil: result.cooldownUntil,
          });
        } catch {
          // Socket failure
        }
      }
    }
    const err = createHttpError(result.message, result.statusCode);
    err.cooldownUntil = result.cooldownUntil;
    throw err;
  }

  if (result.createdSession) {
    await scheduleSessionRelease(result.sessionId, result.sessionExpiresAt);
  }

  try {
    emitSeatEvent(result.eventId, 'seat_locked', {
      seatId,
      label: result.seatLabel,
      userId,
      bookingId: result.booking.id,
      holdSessionId: result.sessionId,
      expiresAt: result.sessionExpiresAt,
      sessionExpiresAt: result.sessionExpiresAt,
      zoneId: result.zone.id,
      zoneName: result.zone.name,
      totalPrice: Number(result.zone.price),
      socketId: socketId ?? null,
    });
  } catch {
    // Socket loi khong anh huong response
  }

  return {
    bookingId: result.booking.id,
    seatId,
    seatLabel: result.seatLabel,
    zoneName: result.zone.name,
    totalPrice: Number(result.zone.price),
    status: result.booking.status,
    holdSessionId: result.sessionId,
    expiresAt: result.sessionExpiresAt,
    sessionExpiresAt: result.sessionExpiresAt,
    createdAt: result.booking.createdAt,
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
    include: {
      holdSession: true,
      seat: { include: { zone: true } },
    },
  });

  if (!booking) {
    throw createHttpError('Khong tim thay thong tin dat cho', 404);
  }

  if (booking.userId !== userId) {
    throw createHttpError('Khong co quyen thuc hien thao tac nay', 403);
  }

  if (booking.status !== 'PENDING') {
    throw createHttpError('Ghe khong o trang thai dang khoa', 400);
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
    emitSeatEvent(eventId, 'seat_released', {
      seatId,
      label: seatLabel,
      holdSessionId: booking.holdSessionId,
    });
  } catch {
    // Socket failure
  }

  return {
    success: true,
    message: 'Da huy giu cho thanh cong',
    holdSessionId: booking.holdSessionId,
    expiresAt: booking.holdSession?.expiresAt || null,
    sessionExpiresAt: booking.holdSession?.expiresAt || null,
  };
}

async function getMyPendingLocks(userId, eventId) {
  const whereCondition = {
    userId,
    status: 'PENDING',
  };

  if (eventId) {
    whereCondition.seat = {
      zone: {
        eventId,
      },
    };
  }

  const pendingBookings = await prisma.booking.findMany({
    where: whereCondition,
    include: {
      holdSession: true,
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
    orderBy: {
      createdAt: 'desc',
    },
  });

  return pendingBookings.map((booking) => {
    const expiresAt = getBookingExpiresAt(booking);
    return {
      bookingId: booking.id,
      seatId: booking.seatId,
      seatLabel: booking.seat.label,
      row: booking.seat.row,
      col: booking.seat.col,
      zoneId: booking.seat.zoneId,
      zoneName: booking.seat.zone.name,
      eventId: booking.seat.zone.eventId,
      eventTitle: booking.seat.zone.event.title,
      eventImageUrl: booking.seat.zone.event.cardImageUrl || booking.seat.zone.event.imageUrl,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      holdSessionId: booking.holdSessionId,
      expiresAt,
      sessionExpiresAt: expiresAt,
      cooldownUntil: booking.holdSession?.cooldownUntil || null,
      createdAt: booking.createdAt,
    };
  });
}

module.exports = {
  lockSeat,
  getMyTickets,
  releaseSeatUser,
  getMyPendingLocks,
};
