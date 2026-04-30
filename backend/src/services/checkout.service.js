const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { seatReleaseQueue } = require('../jobs/queue');
const { emitSeatEvent } = require('../config/socket');
const { sendTicketEmail } = require('../utils/mailer');

const prisma = new PrismaClient();

async function checkout(userId, bookingIds) {
  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    const err = new Error('bookingIds là bắt buộc và phải là mảng không rỗng');
    err.statusCode = 400;
    throw err;
  }

  // Fetch user email + all bookings with seat/zone/event info
  const [user, bookings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      include: {
        seat: {
          include: {
            zone: { include: { event: true } },
          },
        },
      },
    }),
  ]);

  // Validate all requested IDs exist
  if (bookings.length !== bookingIds.length) {
    const foundIds = bookings.map((b) => b.id);
    const missing = bookingIds.filter((id) => !foundIds.includes(id));
    const err = new Error(`Không tìm thấy booking: ${missing.join(', ')}`);
    err.statusCode = 404;
    throw err;
  }

  // Validate ownership
  const notOwned = bookings.filter((b) => b.userId !== userId);
  if (notOwned.length > 0) {
    const err = new Error('Một số booking không thuộc về bạn');
    err.statusCode = 403;
    throw err;
  }

  // Validate all are PENDING
  const notPending = bookings.filter((b) => b.status !== 'PENDING');
  if (notPending.length > 0) {
    const err = new Error(
      `Một số booking không ở trạng thái PENDING: ${notPending.map((b) => b.id).join(', ')}`
    );
    err.statusCode = 409;
    throw err;
  }

  // Validate none are expired (LOCK_DURATION = 10 min, check lockedAt on seat)
  const LOCK_DURATION_MS = 10 * 60 * 1000;
  const now = Date.now();
  const expired = bookings.filter((b) => {
    if (!b.seat.lockedAt) return true;
    return now - new Date(b.seat.lockedAt).getTime() > LOCK_DURATION_MS;
  });

  if (expired.length > 0) {
    const err = new Error(
      `Một số booking đã hết hạn giữ chỗ: ${expired.map((b) => b.id).join(', ')}`
    );
    err.statusCode = 410;
    throw err;
  }

  // Generate QR codes (outside transaction — CPU-bound, no DB side effects)
  const qrMap = {};
  await Promise.all(
    bookings.map(async (b) => {
      const payload = { bookingId: b.id, seatId: b.seatId, userId };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
      qrMap[b.id] = await QRCode.toDataURL(token);
    })
  );

  // Transaction: mark PAID, update seats SOLD, save QR codes
  const updatedBookings = await prisma.$transaction(
    bookings.map((b) =>
      prisma.booking.update({
        where: { id: b.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          qrCode: qrMap[b.id],
          seat: {
            update: { status: 'SOLD', lockedAt: null },
          },
        },
        include: {
          seat: {
            include: {
              zone: { include: { event: true } },
            },
          },
        },
      })
    )
  );

  // Cancel BullMQ auto-release jobs (fire-and-forget, best-effort)
  await Promise.allSettled(
    bookings
      .filter((b) => b.jobId)
      .map(async (b) => {
        const job = await seatReleaseQueue.getJob(b.jobId);
        if (job) await job.remove();
      })
  );

  // Broadcast seat_sold for each unique event
  const eventGroups = {};
  for (const b of updatedBookings) {
    const eventId = b.seat.zone.eventId;
    if (!eventGroups[eventId]) eventGroups[eventId] = [];
    eventGroups[eventId].push({ seatId: b.seatId, label: b.seat.label });
  }
  for (const [eventId, seats] of Object.entries(eventGroups)) {
    for (const seat of seats) {
      try {
        emitSeatEvent(eventId, 'seat_sold', seat);
      } catch {
        // Socket failure does not affect response
      }
    }
  }

  const result = updatedBookings.map((b) => ({
    bookingId: b.id,
    seatId: b.seatId,
    seatLabel: b.seat.label,
    zoneName: b.seat.zone.name,
    eventTitle: b.seat.zone.event.title,
    eventVenue: b.seat.zone.event.venue,
    eventDate: b.seat.zone.event.date,
    totalPrice: Number(b.totalPrice),
    status: b.status,
    paidAt: b.paidAt,
    qrCode: b.qrCode,
  }));

  // Send confirmation email (fire-and-forget — không block response)
  if (user?.email) {
    sendTicketEmail(user.email, result).catch((err) =>
      console.error('[Checkout] Failed to send ticket email:', err.message)
    );
  }

  return result;
}

module.exports = { checkout };
