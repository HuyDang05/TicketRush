const prisma = require('../config/prisma');

async function getAdminTicketEvents(req, res) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'desc' },
      select: {
        id: true,
        title: true,
        venue: true,
        date: true,
        imageUrl: true,
        cardImageUrl: true,
        zones: {
          select: {
            rows: true,
            cols: true,
            seats: {
              where: { status: 'SOLD' },
              select: {
                booking: {
                  where: { status: 'PAID' },
                  select: {
                    totalPrice: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const data = events.map((event) => {
      const totalTickets = event.zones.reduce(
        (sum, zone) => sum + zone.rows * zone.cols,
        0
      );

      const soldTickets = event.zones.reduce(
        (sum, zone) => sum + zone.seats.length,
        0
      );

      const totalRevenue = event.zones.reduce((sum, zone) => {
        const zoneRevenue = zone.seats.reduce((seatSum, seat) => {
          const booking = seat.booking?.[0];
          return seatSum + Number(booking?.totalPrice || 0);
        }, 0);

        return sum + zoneRevenue;
      }, 0);

      return {
        id: event.id,
        title: event.title,
        venue: event.venue,
        date: event.date,
        totalTickets,
        soldTickets,
        availableTickets: totalTickets - soldTickets,
        totalRevenue,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('getAdminTicketEvents error:', error);
    res.status(500).json({
      success: false,
      message: 'Không lấy được danh sách sự kiện',
    });
  }
}

async function getAdminTicketBuyers(req, res) {
  try {
    const { eventId } = req.params;
    const { sortBy = 'time' } = req.query;

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'PAID',
        seat: {
          zone: {
            eventId,
          },
        },
      },
      select: {
        id: true,
        totalPrice: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        seat: {
          select: {
            label: true,
            zone: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy:
        sortBy === 'name'
          ? { user: { fullName: 'asc' } }
          : { createdAt: 'desc' },
    });

    const data = bookings.map((b) => ({
      bookingId: b.id,
      buyerName: b.user.fullName,
      buyerEmail: b.user.email,
      seatLabel: `${b.seat.zone.name} - ${b.seat.label}`,
      buyTime: b.createdAt,
      quantity: 1,
      totalPrice: Number(b.totalPrice),
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getAdminTicketBuyers error:', error);
    res.status(500).json({
      success: false,
      message: 'Không lấy được danh sách người mua vé',
    });
  }
}

module.exports = {
  getAdminTicketEvents,
  getAdminTicketBuyers,
};