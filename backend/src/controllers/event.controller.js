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

const createEvent = async (req, res) => {
  try {
    const { title, description, venue, startDate, endDate, imageUrl, rows, cols, zones } = req.body;
    const createdBy = req.user.id;

    if (!startDate) {
      return res.status(400).json({ message: 'Ngày bắt đầu là bắt buộc' });
    }

    const eventStartDate = new Date(startDate);
    if (eventStartDate <= new Date()) {
      return res.status(400).json({ message: 'Ngày bắt đầu phải trong tương lai' });
    }

    let eventEndDate = null;
    if (endDate) {
      eventEndDate = new Date(endDate);
      if (eventEndDate <= eventStartDate) {
        return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
      }
    }

    // Validate seat layout
    const numRows = parseInt(rows);
    const numCols = parseInt(cols);
    if (!numRows || numRows < 1 || !numCols || numCols < 1) {
      return res.status(400).json({ message: 'Số hàng ghế và số cột ghế phải ≥ 1' });
    }

    // Validate zones
    if (!Array.isArray(zones) || zones.length === 0) {
      return res.status(400).json({ message: 'Phải có ít nhất một loại vé' });
    }

    for (const zone of zones) {
      if (!zone.name || !zone.price || zone.price <= 0) {
        return res.status(400).json({ message: 'Loại vé phải có tên và giá > 0' });
      }
    }

    // Transaction: create event + zones + seats
    const event = await prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          title,
          description,
          venue,
          date: eventStartDate,
          endDate: eventEndDate,
          imageUrl,
          status: 'DRAFT',
          createdBy,
        },
      });

      for (const zone of zones) {
        const createdZone = await tx.zone.create({
          data: {
            eventId: createdEvent.id,
            name: zone.name,
            rows: numRows,
            cols: numCols,
            price: parseFloat(zone.price),
          },
        });

        // Generate seats
        const seats = [];
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const label = String.fromCharCode(65 + row) + (col + 1);
            seats.push({
              zoneId: createdZone.id,
              row,
              col,
              label,
              status: 'AVAILABLE',
            });
          }
        }

        await tx.seat.createMany({ data: seats });
      }

      return createdEvent;
    });

    return res.status(201).json({
      message: 'Sự kiện được tạo thành công',
      event,
    });
  } catch (error) {
    console.error('[Event][createEvent] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, venue, date, imageUrl } = req.body;

    // Check event exists and is DRAFT
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        zones: {
          include: {
            seats: {
              select: { status: true },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    if (event.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Chỉ có thể sửa sự kiện trong trạng thái DRAFT' });
    }

    // Check no LOCKED or SOLD seats
    const hasLockedOrSoldSeats = event.zones.some(zone =>
      zone.seats.some(seat => seat.status === 'LOCKED' || seat.status === 'SOLD')
    );

    if (hasLockedOrSoldSeats) {
      return res.status(400).json({ message: 'Không thể sửa khi có ghế bị khóa hoặc bán' });
    }

    // Validate new date if provided
    if (date) {
      const newDate = new Date(date);
      if (newDate <= new Date()) {
        return res.status(400).json({ message: 'Ngày sự kiện phải trong tương lai' });
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: title || event.title,
        description: description !== undefined ? description : event.description,
        venue: venue || event.venue,
        date: date ? new Date(date) : event.date,
        imageUrl: imageUrl !== undefined ? imageUrl : event.imageUrl,
      },
    });

    return res.status(200).json({
      message: 'Sự kiện được cập nhật thành công',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('[Event][updateEvent] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const publishEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    if (event.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Chỉ có thể công khai sự kiện ở trạng thái DRAFT' });
    }

    // Validate date still in future
    if (event.date <= new Date()) {
      return res.status(400).json({ message: 'Ngày sự kiện phải trong tương lai để công khai' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    return res.status(200).json({
      message: 'Sự kiện được công khai thành công',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('[Event][publishEvent] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const endEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({ message: 'Chỉ có thể kết thúc sự kiện ở trạng thái PUBLISHED' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: 'ENDED' },
    });

    return res.status(200).json({
      message: 'Sự kiện được kết thúc',
      event: updatedEvent,
    });
  } catch (error) {
    console.error('[Event][endEvent] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    // Delete all related data via cascade or explicit order
    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { seat: { zone: { eventId: id } } } }),
      prisma.seat.deleteMany({ where: { zone: { eventId: id } } }),
      prisma.zone.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id } }),
    ]);

    return res.status(200).json({ message: 'Đã xoá sự kiện thành công' });
  } catch (error) {
    console.error('[Event][deleteEvent] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const getAdminEvents = async (req, res) => {
  try {
    const { search, status } = req.query;

    const whereCondition = {};

    if (status) {
      whereCondition.status = status;
    }

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
            rows: true,
            cols: true,
            _count: { select: { seats: true } },
          },
        },
        _count: {
          select: { zones: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    const formatted = events.map(event => {
      const totalSeats = event.zones.reduce((s, z) => s + (z.rows * z.cols), 0);
      const minPrice = event.zones.length > 0
        ? Math.min(...event.zones.map(z => Number(z.price)))
        : null;
      const { zones, ...rest } = event;
      return { ...rest, totalSeats, minPrice };
    });

    return res.status(200).json({ events: formatted });
  } catch (error) {
    console.error('[Event][getAdminEvents] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const getAdminEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        zones: {
          select: {
            id: true,
            name: true,
            rows: true,
            cols: true,
            price: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    return res.status(200).json({ event });
  } catch (error) {
    console.error('[Event][getAdminEventById] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

module.exports = {
  getEvents,
  getEventById,
  getAdminEvents,
  getAdminEventById,
  createEvent,
  updateEvent,
  publishEvent,
  endEvent,
  deleteEvent,
};
