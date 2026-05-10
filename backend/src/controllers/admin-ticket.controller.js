const prisma = require('../config/prisma');

async function getAdminTicketEvents(req, res) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'desc' },
      include: {
        zones: {
          include: {
            seats: {
              include: {
                booking: true,
              },
            },
          },
        },
      },
    });

    const data = events.map((event) => {
      const seats = event.zones.flatMap((z) => z.seats);
      const soldSeats = seats.filter(
        (s) => s.booking && s.booking.status === 'PAID'
      );

      return {
        id: event.id,
        title: event.title,
        venue: event.venue,
        date: event.date,
        imageUrl: event.imageUrl || event.cardImageUrl,
        totalTickets: seats.length,
        soldTickets: soldSeats.length,
        availableTickets: seats.length - soldSeats.length,
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
      include: {
        user: true,
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