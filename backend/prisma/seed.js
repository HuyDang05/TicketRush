const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  errorFormat: 'pretty',
});

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
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

    if (fs.existsSync(eventsFilePath)) {
      const eventsData = JSON.parse(fs.readFileSync(eventsFilePath, 'utf8'));
      const eventsToCreate = eventsData.events;

      console.log(`Đã tìm thấy ${eventsToCreate.length} events. Đang tiến hành tạo...`);

      let createdCount = 0;
      for (const event of eventsToCreate) {
        const geoLat = event.geo?.latitude != null ? Number(event.geo.latitude) : null;
        const geoLong = event.geo?.longitude != null ? Number(event.geo.longitude) : null;

        const createdEvent = await prisma.event.create({
          data: {
            title: event.title,
            description: event.description,
            venue: event.venue || 'TBD',
            geoLat: Number.isFinite(geoLat) ? geoLat : null,
            geoLong: Number.isFinite(geoLong) ? geoLong : null,
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
        }
      }
      console.log(`✅ Tạo thành công ${createdCount} events từ file.`);
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
