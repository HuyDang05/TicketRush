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
    const { title, description, venue, date, imageUrl } = req.body;
    const createdBy = req.user.id;

    // Validate event date is in future
    const eventDate = new Date(date);
    if (eventDate <= new Date()) {
      return res.status(400).json({ message: 'Ngày sự kiện phải trong tương lai' });
    }

    // Zones are optional at creation time — the seatmap editor handles them via saveSeatmap
    const event = await prisma.event.create({
      data: {
        title,
        description,
        venue,
        date: eventDate,
        imageUrl,
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

// GET /api/admin/events/:id  (admin — no status filter)
const getAdminEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });
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

    // ── 1. Validate request body presence ───────────────────────────
    if (seatmapVersion === undefined || seatmapVersion === null) {
      return res.status(400).json({ message: 'seatmapVersion là bắt buộc' });
    }
    if (!seatmap) {
      return res.status(400).json({ message: 'seatmap là bắt buộc' });
    }

    // ── 2. Validate JSON structure ───────────────────────────────────
    const structureError = validateSeatmapStructure(seatmap);
    if (structureError) {
      return res.status(400).json({ message: structureError });
    }

    // ── 3. Load event ────────────────────────────────────────────────
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

    // ── 4. Status guard: block edits when PUBLISHED and tickets sold ─
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

    // ── 5. Optimistic locking ────────────────────────────────────────
    if (Number(seatmapVersion) !== event.seatmapVersion) {
      return res.status(409).json({
        message: 'Seatmap đã được cập nhật bởi người khác. Vui lòng tải lại trang.',
        currentVersion: event.seatmapVersion,
      });
    }

    // ── 6. Persist seatmapJson + bump version + sync Zone/Seat ───────
    const nextVersion = event.seatmapVersion + 1;

    await prisma.$transaction(async (tx) => {
      // 6a. Save the raw JSON and bump version
      await tx.event.update({
        where: { id },
        data: {
          seatmapJson: seatmap,
          seatmapVersion: nextVersion,
        },
      });

      // 6b. Collect existing zone DB ids keyed by seatmap zone id
      //     We use the zone's seatmap-level id stored in seatmapJson to match.
      //     Strategy: delete all current zones (cascade → seats) then recreate.
      //     This is safe because we checked no SOLD seats above.
      await tx.seat.deleteMany({ where: { zone: { eventId: id } } });
      await tx.zone.deleteMany({ where: { eventId: id } });

      // 6c. Recreate zones and seats from the parsed seatmap
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
  getAdminEventById,
  createEvent,
  updateEvent,
  publishEvent,
  endEvent,
  deleteEvent,
  getSeatmap,
  saveSeatmap,
};
