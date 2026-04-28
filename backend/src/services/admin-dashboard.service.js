const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getAdminDashboard(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      venue: true,
      date: true,
      status: true,
    },
  });

  if (!event) {
    const err = new Error('Sự kiện không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  const seatStats = await prisma.seat.groupBy({
    by: ['status'],
    where: {
      zone: {
        eventId,
      },
    },
    _count: {
      id: true,
    },
  });

  const totalSeats = seatStats.reduce((sum, item) => sum + item._count.id, 0);

  const soldSeats =
    seatStats.find((item) => item.status === 'SOLD')?._count.id || 0;

  const lockedSeats =
    seatStats.find((item) => item.status === 'LOCKED')?._count.id || 0;

  const availableSeats =
    seatStats.find((item) => item.status === 'AVAILABLE')?._count.id || 0;

  const revenueResult = await prisma.booking.aggregate({
    where: {
      status: 'PAID',
      seat: {
        zone: {
          eventId,
        },
      },
    },
    _sum: {
      totalPrice: true,
    },
  });

  const revenue = Number(revenueResult._sum.totalPrice || 0);

  const occupancyRate =
    totalSeats === 0 ? 0 : Number(((soldSeats / totalSeats) * 100).toFixed(2));

  const zones = await prisma.zone.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
    include: {
      seats: {
        select: {
          id: true,
          status: true,
          booking: {
            select: {
              status: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  });

  const zoneStats = zones.map((zone) => {
    const zoneTotalSeats = zone.seats.length;
    const zoneSoldSeats = zone.seats.filter((s) => s.status === 'SOLD').length;
    const zoneLockedSeats = zone.seats.filter((s) => s.status === 'LOCKED').length;
    const zoneAvailableSeats = zone.seats.filter(
      (s) => s.status === 'AVAILABLE'
    ).length;

    const zoneRevenue = zone.seats.reduce((sum, seat) => {
      if (seat.booking?.status === 'PAID') {
        return sum + Number(seat.booking.totalPrice);
      }
      return sum;
    }, 0);

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      price: Number(zone.price),
      totalSeats: zoneTotalSeats,
      soldSeats: zoneSoldSeats,
      lockedSeats: zoneLockedSeats,
      availableSeats: zoneAvailableSeats,
      revenue: zoneRevenue,
    };
  });

  return {
    event,
    summary: {
      totalSeats,
      soldSeats,
      lockedSeats,
      availableSeats,
      revenue,
      occupancyRate,
    },
    zones: zoneStats,
    updatedAt: new Date(),
  };
}

module.exports = {
  getAdminDashboard,
};