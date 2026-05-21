const prisma = require('../config/prisma');

// ── Seatmap validation ────────────────────────────────────────────────────────

function validateSeatmapStructure(seatmap) {
  if (!seatmap || typeof seatmap !== 'object') {
    return 'seatmap phải là một object';
  }
  if (!Array.isArray(seatmap.zones) || seatmap.zones.length === 0) {
    return 'seatmap.zones phải là mảng và có ít nhất 1 khu vực';
  }
  for (let i = 0; i < seatmap.zones.length; i++) {
    const z = seatmap.zones[i];
    if (!z.id || typeof z.id !== 'string') {
      return `zones[${i}].id là bắt buộc`;
    }
    if (!z.name || typeof z.name !== 'string') {
      return `zones[${i}].name là bắt buộc`;
    }
    if (!Array.isArray(z.seats) || z.seats.length === 0) {
      return `zones[${i}] (${z.name}) phải có ít nhất 1 ghế`;
    }
    if (typeof z.price !== 'number' || z.price <= 0) {
      return `zones[${i}] (${z.name}): price phải > 0`;
    }
    for (let j = 0; j < z.seats.length; j++) {
      const s = z.seats[j];
      if (!s.id || !s.label) {
        return `zones[${i}].seats[${j}]: id và label là bắt buộc`;
      }
    }
  }
  return null;
}

const getEvents = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const pageNum = Number(page);
    const pageSize = Number(limit);
    const skip = (pageNum - 1) * pageSize;

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
      select: {
        id: true,
        title: true,
        description: true,
        venue: true,
        date: true,
        endDate: true,
        imageUrl: true,
        cardImageUrl: true,
        status: true,
        createdAt: true,
        createdBy: true,
        seatmapVersion: true,
        zones: {
          select: {
            price: true,
            _count: {
              select: {
                seats: {
                  where: { status: 'SOLD' },
                },
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      skip,
      take: pageSize,
    });

    const formattedEvents = events.map(event => {
      let minPrice = null;
      let soldTickets = 0;
      if (event.zones && event.zones.length > 0) {
        minPrice = Math.min(...event.zones.map(z => Number(z.price)));
        soldTickets = event.zones.reduce(
          (sum, zone) => sum + zone._count.seats,
          0
        );
      }

      const { zones, ...eventData } = event;
      return {
        ...eventData,
        minPrice,
        soldTickets,
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
    const { title, description, venue, startDate, endDate, imageUrl, cardImageUrl } = req.body;
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

    // Transaction: create event without zones/seats (Seatmap Editor will handle it)
    const event = await prisma.event.create({
      data: {
        title,
        description,
        venue,
        date: eventStartDate,
        endDate: eventEndDate,
        imageUrl,
        cardImageUrl,
        status: 'DRAFT',
        createdBy,
      },
    });

    return res.status(201).json({
      message: 'Sự kiện được tạo thành công',
      event,
    });
  } catch (error) {
    console.error('[Event][createEvent] Error:', error);
    if (error?.code === 'P2003') {
      return res.status(401).json({
        message: 'Phiên đăng nhập không còn hợp lệ (tài khoản không tồn tại). Vui lòng đăng nhập lại.',
      });
    }
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, venue, startDate, endDate, imageUrl, cardImageUrl } = req.body;

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

    let eventStartDate = event.date;
    if (startDate) {
      eventStartDate = new Date(startDate);
      if (eventStartDate <= new Date()) {
        return res.status(400).json({ message: 'Ngày sự kiện phải trong tương lai' });
      }
    }

    let eventEndDate = event.endDate;
    if (endDate !== undefined) {
      if (endDate) {
        eventEndDate = new Date(endDate);
        if (eventEndDate <= eventStartDate) {
          return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
        }
      } else {
        eventEndDate = null;
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: title || event.title,
        description: description !== undefined ? description : event.description,
        venue: venue || event.venue,
        date: eventStartDate,
        endDate: eventEndDate,
        imageUrl: imageUrl !== undefined ? imageUrl : event.imageUrl,
        cardImageUrl: cardImageUrl !== undefined ? cardImageUrl : event.cardImageUrl,
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
    const { search, status, page = 1, limit = 10 } = req.query;

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip     = (pageNum - 1) * pageSize;

    const whereCondition = {};

    if (status) {
      // frontend gửi 'pub'/'draft'/'ended' → map sang enum
      const statusMap = { pub: 'PUBLISHED', draft: 'DRAFT', ended: 'ENDED' };
      whereCondition.status = statusMap[status] || status;
    }

    if (search) {
      whereCondition.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Chạy song song: đếm tổng + lấy trang hiện tại
    const [total, events] = await Promise.all([
      prisma.event.count({ where: whereCondition }),
      prisma.event.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          venue: true,
          date: true,
          endDate: true,
          status: true,
          imageUrl: true,
          cardImageUrl: true,
          createdAt: true,
          createdBy: true,
          zones: {
            select: {
              price: true,
              rows: true,
              cols: true,
              _count: {
                select: {
                  seats: true,                          // tổng ghế
                },
              },
            },
          },
          // đếm sold seats qua booking
          _count: { select: { zones: true } },
        },
        orderBy: { date: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    // Tính soldSeats: ~10 queries song song (1 per event in page) — OK với pagination
    const eventIds = events.map(e => e.id);
    let soldMap = {};
    if (eventIds.length > 0) {
      await Promise.all(
        eventIds.map(async (eventId) => {
          soldMap[eventId] = await prisma.seat.count({
            where: { zone: { eventId }, status: 'SOLD' },
          });
        })
      );
    }

    const formatted = events.map(event => {
      const totalSeats = event.zones.reduce((s, z) => s + (z.rows * z.cols), 0);
      const minPrice   = event.zones.length > 0
        ? Math.min(...event.zones.map(z => Number(z.price)))
        : null;
      const { zones, ...rest } = event;
      return { ...rest, totalSeats, minPrice, soldSeats: soldMap[event.id] ?? 0 };
    });

    return res.status(200).json({
      events: formatted,
      total,
      page:  pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
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

// GET /api/admin/events/:id/seatmap
const getSeatmap = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        seatmapJson: true,
        seatmapVersion: true,
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    return res.status(200).json({
      seatmapJson: event.seatmapJson,
      seatmapVersion: event.seatmapVersion,
      status: event.status,
    });
  } catch (error) {
    console.error('[Event][getSeatmap] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra' });
  }
};

// PUT /api/admin/events/:id/seatmap
const saveSeatmap = async (req, res) => {
  try {
    const { id } = req.params;
    const { seatmapVersion, seatmap } = req.body;

    if (seatmapVersion === undefined || seatmapVersion === null) {
      return res.status(400).json({ message: 'seatmapVersion là bắt buộc' });
    }
    if (!seatmap) {
      return res.status(400).json({ message: 'seatmap là bắt buộc' });
    }

    const structureError = validateSeatmapStructure(seatmap);
    if (structureError) {
      return res.status(400).json({ message: structureError });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        seatmapVersion: true,
        zones: {
          select: {
            id: true,
            seats: { select: { status: true } },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    }

    if (event.status === 'PUBLISHED') {
      const hasSoldSeats = event.zones.some(z =>
        z.seats.some(s => s.status === 'SOLD')
      );
      if (hasSoldSeats) {
        return res.status(409).json({
          message: 'Không thể sửa seatmap khi sự kiện đã công khai và có vé đã bán',
        });
      }
    }

    if (event.status === 'ENDED') {
      return res.status(400).json({ message: 'Không thể sửa seatmap của sự kiện đã kết thúc' });
    }

    if (Number(seatmapVersion) !== event.seatmapVersion) {
      return res.status(409).json({
        message: 'Seatmap đã được cập nhật bởi người khác. Vui lòng tải lại trang.',
        currentVersion: event.seatmapVersion,
      });
    }

    const nextVersion = event.seatmapVersion + 1;

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          seatmapJson: seatmap,
          seatmapVersion: nextVersion,
        },
      });

      await tx.seat.deleteMany({ where: { zone: { eventId: id } } });
      await tx.zone.deleteMany({ where: { eventId: id } });

      for (const zoneData of seatmap.zones) {
        const rows = zoneData.config?.rows ?? 0;
        const cols = zoneData.config?.cols ?? (zoneData.seats.length > 0 ? zoneData.seats.length : 1);

        const zoneCreateData = {
          eventId: id,
          name: zoneData.name,
          rows,
          cols,
          price: parseFloat(zoneData.price),
        };
        if (zoneData.id) zoneCreateData.id = zoneData.id;

        const createdZone = await tx.zone.create({ data: zoneCreateData });

        if (zoneData.seats.length > 0) {
          await tx.seat.createMany({
            data: zoneData.seats.map((seat) => {
              const seatData = {
                zoneId: createdZone.id,
                row: typeof seat.row === 'number' ? seat.row : 0,
                col: typeof seat.col === 'number' ? seat.col : 0,
                label: seat.label,
                status: 'AVAILABLE',
              };
              if (seat.id) seatData.id = seat.id;
              return seatData;
            }),
            skipDuplicates: true,
          });
        }
      }
    });

    return res.status(200).json({
      message: 'Đã lưu sơ đồ ghế thành công',
      seatmapVersion: nextVersion,
    });
  } catch (error) {
    console.error('[Event][saveSeatmap] Error:', error);
    return res.status(500).json({ message: 'Đã có lỗi xảy ra khi lưu sơ đồ ghế' });
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
  getSeatmap,
  saveSeatmap,
};
