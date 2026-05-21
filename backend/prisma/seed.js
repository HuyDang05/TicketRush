const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const prisma = new PrismaClient({
  errorFormat: 'pretty',
});

const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  'TicketRushSeeder/1.0 (admin@ticketrush.com)';
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || '';
const NOMINATIM_DELAY_MS = Number(process.env.NOMINATIM_DELAY_MS || 2000);
const NOMINATIM_MAX_RETRIES = Number(process.env.NOMINATIM_MAX_RETRIES || 2);

let lastNominatimRequestAt = 0;

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

const EVENT_CATEGORIES = new Set([
  'music',
  'seminarsworkshops',
  'sport',
  'theatersandart',
  'attractionsexperiences',
  'others',
]);

function getEventCategory(event) {
  const category = event.category ?? event._source?.category ?? null;
  if (category == null || category === '') {
    return null;
  }
  if (!EVENT_CATEGORIES.has(category)) {
    throw new Error(`Category không hợp lệ trong events.json: ${category}`);
  }
  return category;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeVenue(venue) {
  return typeof venue === 'string' ? venue.trim() : '';
}

function removeFirstVenueSegment(venue) {
  const commaIndex = venue.indexOf(',');
  if (commaIndex === -1) {
    return '';
  }

  return normalizeVenue(venue.slice(commaIndex + 1));
}

async function waitForNominatimRateLimit() {
  const elapsed = Date.now() - lastNominatimRequestAt;
  const delay = Math.max(0, NOMINATIM_DELAY_MS - elapsed);
  if (delay > 0) {
    await sleep(delay);
  }
  lastNominatimRequestAt = Date.now();
}

async function searchNominatim(query) {
  await waitForNominatimRateLimit();

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'vn',
    addressdetails: '0',
  });

  if (NOMINATIM_EMAIL) {
    params.set('email', NOMINATIM_EMAIL);
  }

  let response;
  for (let attempt = 0; attempt <= NOMINATIM_MAX_RETRIES; attempt++) {
    try {
      response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
        params,
        timeout: 15000,
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          Accept: 'application/json',
          'Accept-Language': 'vi,en',
        },
      });
      break;
    } catch (error) {
      const status = error.response?.status;
      const shouldRetry = status === 429 || status === 503;
      if (!shouldRetry || attempt === NOMINATIM_MAX_RETRIES) {
        throw error;
      }

      const retryAfterSeconds = Number(error.response?.headers?.['retry-after']);
      const retryDelay = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : NOMINATIM_DELAY_MS * (attempt + 2);

      console.warn(
        `  ⚠️ Nominatim trả ${status}, chờ ${Math.ceil(retryDelay / 1000)}s rồi thử lại...`
      );
      await sleep(retryDelay);
    }
  }

  const firstResult = Array.isArray(response.data) ? response.data[0] : null;
  const geoLat = firstResult?.lat != null ? Number(firstResult.lat) : null;
  const geoLong = firstResult?.lon != null ? Number(firstResult.lon) : null;

  return {
    geoLat: Number.isFinite(geoLat) ? geoLat : null,
    geoLong: Number.isFinite(geoLong) ? geoLong : null,
  };
}

async function geocodeVenue(venue) {
  const query = normalizeVenue(venue);
  if (!query || query === 'TBD') {
    return { geoLat: null, geoLong: null, attemptedQueries: [] };
  }

  const fallbackQuery = removeFirstVenueSegment(query);
  const queries = [query];
  if (fallbackQuery && fallbackQuery !== query) {
    queries.push(fallbackQuery);
  }

  for (const currentQuery of queries) {
    const coordinates = await searchNominatim(currentQuery);
    if (coordinates.geoLat != null && coordinates.geoLong != null) {
      return {
        ...coordinates,
        matchedQuery: currentQuery,
        attemptedQueries: queries.slice(0, queries.indexOf(currentQuery) + 1),
      };
    }
  }

  return { geoLat: null, geoLong: null, attemptedQueries: queries };
}

async function getVenueCoordinates(venue, geocodeCache) {
  const query = normalizeVenue(venue);
  if (!query || query === 'TBD') {
    return { geoLat: null, geoLong: null };
  }

  if (Object.prototype.hasOwnProperty.call(geocodeCache, query)) {
    const cachedCoordinates = geocodeCache[query];
    const hasCoordinates =
      cachedCoordinates.geoLat != null && cachedCoordinates.geoLong != null;
    const wasCheckedWithFallback = Array.isArray(cachedCoordinates.attemptedQueries);

    if (hasCoordinates || wasCheckedWithFallback) {
      return cachedCoordinates;
    }
  }

  try {
    const coordinates = await geocodeVenue(query);
    geocodeCache[query] = coordinates;

    if (coordinates.geoLat == null || coordinates.geoLong == null) {
      console.warn(`  ⚠️ Không geocode được venue: ${query}`);
    } else if (coordinates.matchedQuery && coordinates.matchedQuery !== query) {
      console.log(
        `  ↳ Geocode bằng query rút gọn: "${coordinates.matchedQuery}"`
      );
    }

    return coordinates;
  } catch (error) {
    console.warn(
      `  ⚠️ Lỗi geocode venue "${query}": ${error.response?.status || error.message}`
    );
    geocodeCache[query] = { geoLat: null, geoLong: null };
    return geocodeCache[query];
  }
}

// Tạo seats theo dạng vòng cung (arc layout)
// arcRow: số thứ tự vòng cung (1, 2, 3, ...)
// seatsPerArc: số ghế trong vòng cung
// label: dùng để đánh nhãn hàng (A, B, C, ...)
async function createArcSeats(zoneId, arcConfigs) {
  const seats = [];
  const arcLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

  for (let arcIndex = 0; arcIndex < arcConfigs.length; arcIndex++) {
    const seatsPerArc = arcConfigs[arcIndex];
    const rowLabel = arcLabels[arcIndex];

    for (let col = 0; col < seatsPerArc; col++) {
      const label = `${rowLabel}${col + 1}`;
      seats.push({
        zoneId,
        row: arcIndex,
        col,
        label,
        status: 'AVAILABLE',
      });
    }
  }

  return seats;
}

async function main() {
  try {
    console.log('🌱 Bắt đầu seed dữ liệu...\n');

    // Clear existing data
    console.log('🗑️  Xóa dữ liệu cũ...');
    await prisma.booking.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // 1. Tạo users
    console.log('👥 Tạo users...');
    const adminPassword = await hashPassword('admin123');
    const customerPassword = await hashPassword('123456789');

    const admin = await prisma.user.create({
      data: {
        email: 'admin@ticketrush.com',
        password: adminPassword,
        fullName: 'Admin TicketRush',
        role: 'ADMIN',
      },
    });

    const customer1 = await prisma.user.create({
      data: {
        email: 'cus1@gmail.com',
        password: customerPassword,
        fullName: 'Nguyen Van A',
        role: 'CUSTOMER',
        dob: new Date('2000-01-15'),
        gender: 'MALE',
      },
    });

    const customer2 = await prisma.user.create({
      data: {
        email: 'cus2@gmail.com',
        password: customerPassword,
        fullName: 'Tran Thi B',
        role: 'CUSTOMER',
        dob: new Date('2001-05-20'),
        gender: 'FEMALE',
      },
    });

    console.log('✅ Tạo 3 users thành công');

    // 2. Tạo events từ file crawler/events.json
    console.log('\n🎭 Tạo events từ events.json...');
    const fs = require('fs');
    const path = require('path');
    const eventsFilePath = path.join(__dirname, '../../crawler/events.json');
    const geocodeCachePath = path.join(__dirname, '.nominatim-cache.json');

    if (fs.existsSync(eventsFilePath)) {
      const eventsData = JSON.parse(fs.readFileSync(eventsFilePath, 'utf8'));
      const eventsToCreate = eventsData.events;
      const geocodeCache = fs.existsSync(geocodeCachePath)
        ? JSON.parse(fs.readFileSync(geocodeCachePath, 'utf8'))
        : {};

      console.log(`Đã tìm thấy ${eventsToCreate.length} events. Đang tiến hành tạo...`);
      console.log(
        `Geocoding venue bằng Nominatim (${Object.keys(geocodeCache).length} venue đã cache)...`
      );

      let createdCount = 0;
      const categoryStats = {};
      for (const event of eventsToCreate) {
        const venue = normalizeVenue(event.venue) || 'TBD';
        const { geoLat, geoLong } = await getVenueCoordinates(venue, geocodeCache);
        const category = getEventCategory(event);
        if (category) {
          categoryStats[category] = (categoryStats[category] || 0) + 1;
        }

        const createdEvent = await prisma.event.create({
          data: {
            title: event.title,
            description: event.description,
            venue,
            category,
            geoLat,
            geoLong,
            date: new Date(event.date),
            endDate: event.endDate ? new Date(event.endDate) : null,
            imageUrl: event.imageUrl,
            cardImageUrl: event.cardImageUrl,
            status: event.status,
            createdAt: new Date(event.createdAt),
            seatmapJson: event.seatmapJson,
            seatmapVersion: event.seatmapVersion,
            createdBy: admin.id,
          },
        });

        for (const zoneData of event.zones) {
          const createdZone = await prisma.zone.create({
            data: {
              eventId: createdEvent.id,
              name: zoneData.name,
              rows: zoneData.rows,
              cols: zoneData.cols,
              price: zoneData.price,
            },
          });

          const seatmapZone = event.seatmapJson?.zones?.find(
            (z) => z.name === zoneData.name
          );
          
          if (seatmapZone && seatmapZone.seats) {
            const seatsToCreate = seatmapZone.seats.map((seat) => ({
              zoneId: createdZone.id,
              row: seat.row,
              col: seat.col,
              label: seat.label,
              status: seat.status || 'AVAILABLE',
            }));

            await prisma.seat.createMany({
              data: seatsToCreate,
            });
          }
        }

        createdCount++;
        if (createdCount % 50 === 0) {
          console.log(`  Đã tạo ${createdCount}/${eventsToCreate.length} events...`);
          fs.writeFileSync(geocodeCachePath, JSON.stringify(geocodeCache, null, 2));
        }
      }
      fs.writeFileSync(geocodeCachePath, JSON.stringify(geocodeCache, null, 2));
      console.log(`✅ Tạo thành công ${createdCount} events từ file.`);
      console.log('📚 Category đã seed:', categoryStats);
    } else {
      console.log('⚠️ Không tìm thấy file events.json. Bỏ qua tạo sự kiện.');
    }

    console.log('\n✨ Seed dữ liệu hoàn tất!\n');
    console.log('📊 Thống kê:');
    console.log('  - Users: 1 Admin + 2 Customer');
    /*
    console.log('  - Events: 2 PUBLISHED + 1 DRAFT');
    console.log('  - Zones: 9 (3 per event)');
    console.log('');
    console.log('  Mỗi Event:');
    console.log('    • VIP: 20 ghế (2 vòng: 9 + 11)');
    console.log('    • Khu A: 28 ghế (2 vòng: 13 + 15)');
    console.log('    • Khu B: 57 ghế (3 vòng: 17 + 19 + 21)');
    console.log('  ────────────────────────────');
    console.log('  • Tổng ghế/event: 105 ghế');
    console.log('  • Tổng ghế: 315 ghế');
    console.log('  - Bookings: 2');
    */
    console.log('\n🔐 Tài Khoản Test:');
    console.log('  Admin: admin@ticketrush.com / admin123');
    console.log('  Customer 1: cus1@gmail.com / 123456789');
    console.log('  Customer 2: cus2@gmail.com / 123456789');
    /*
    console.log('\n🎯 Arc Layout Mỗi Zone:');
    console.log('  VIP (2,500,000đ): A(9) → B(11)');
    console.log('  Khu A (1,500,000đ): C(13) → D(15)');
    console.log('  Khu B (800,000đ): E(17) → F(19) → G(21)');
    */
  } catch (error) {
    console.error('❌ Lỗi seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
