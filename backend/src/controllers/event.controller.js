const prisma = require('../config/prisma');

const getEvents = async (req, res) => {
  try {
    const { search } = req.query;

    const whereCondition = {
      status: 'PUBLISHED',
    };

    if (search) {
      whereCondition.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const events = await prisma.event.findMany({
      where: whereCondition,
      include: {
        zones: {
          select: {
            price: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const formattedEvents = events.map(event => {
      let minPrice = null;
      if (event.zones && event.zones.length > 0) {
        minPrice = Math.min(...event.zones.map(z => Number(z.price)));
      }

      const { zones, ...eventData } = event;
      return {
        ...eventData,
        minPrice,
      };
    });

    return res.status(200).json({
      events: formattedEvents,
    });
  } catch (error) {
    console.error('[Event][getEvents] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: {
        id,
        status: 'PUBLISHED',
      },
      include: {
        zones: {
          include: {
            seats: {
              select: {
                id: true,
                label: true,
                row: true,
                col: true,
                status: true,
              },
              orderBy: [
                { row: 'asc' },
                { col: 'asc' }
              ]
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại hoặc chưa được công khai' });
    }

    return res.status(200).json({
      event,
    });
  } catch (error) {
    console.error('[Event][getEventById] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

module.exports = {
  getEvents,
  getEventById,
};
