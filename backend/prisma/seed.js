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
    const customerPassword = await hashPassword('12345');

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

    // 2. Tạo events
    console.log('\n🎭 Tạo events...');

    const event1 = await prisma.event.create({
      data: {
        createdBy: admin.id,
        title: 'Concert Đông Nhi 2024',
        description: 'Concert lớn nhất năm với các bài hát kinh điển',
        venue: 'Nhà thi đấu Phú Thọ, TP HCM',
        date: new Date('2024-12-25T19:00:00'),
        imageUrl: 'https://via.placeholder.com/600x400?text=Concert+Dong+Nhi',
        status: 'PUBLISHED',
      },
    });

    const event2 = await prisma.event.create({
      data: {
        createdBy: admin.id,
        title: 'DJ Sơn Tùng M-TP Live 2024',
        description: 'Đêm nhạc EDM sôi động từ DJ Sơn Tùng',
        venue: 'Sân vận động Mỹ Đình, Hà Nội',
        date: new Date('2024-11-15T20:00:00'),
        imageUrl: 'https://th.bing.com/th/id/R.9dfffb02fcde33c007dc02819eea95b3?rik=dmEvtnLM3HNwUw&pid=ImgRaw&r=0',
        status: 'PUBLISHED',
      },
    });

    const event3 = await prisma.event.create({
      data: {
        createdBy: admin.id,
        title: 'Festival Âm Nhạc 2025',
        description: 'Festival lớn với nhiều nghệ sĩ nổi tiếng',
        venue: 'Công viên Tao Đàn, TP HCM',
        date: new Date('2025-03-10T18:00:00'),
        imageUrl: 'https://via.placeholder.com/600x400?text=Music+Festival',
        status: 'DRAFT',
      },
    });

    console.log('✅ Tạo 3 events thành công (2 PUBLISHED, 1 DRAFT)');

    // 3. Tạo zones với arc layout
    console.log('\n🎯 Tạo zones với arc layout và seats...');

    // Cấu hình zones theo arc layout
    const zoneConfigs = [
      {
        name: 'VIP',
        price: 2500000,
        arcSeatsPerRow: [9, 11], // 2 vòng cung đầu
      },
      {
        name: 'Khu A',
        price: 1500000,
        arcSeatsPerRow: [13, 15], // 2 vòng cung tiếp theo
      },
      {
        name: 'Khu B',
        price: 800000,
        arcSeatsPerRow: [17, 19, 21], // 3 vòng cung cuối
      },
    ];

    for (const event of [event1, event2, event3]) {
      for (const zoneConfig of zoneConfigs) {
        const zone = await prisma.zone.create({
          data: {
            eventId: event.id,
            name: zoneConfig.name,
            rows: zoneConfig.arcSeatsPerRow.length, // Số lượng vòng cung
            cols: Math.max(...zoneConfig.arcSeatsPerRow), // Ghế tối đa trong 1 vòng
            price: zoneConfig.price,
          },
        });

        // Tạo seats theo arc layout
        const seatsData = await createArcSeats(zone.id, zoneConfig.arcSeatsPerRow);
        await prisma.seat.createMany({
          data: seatsData,
        });

        const totalSeats = zoneConfig.arcSeatsPerRow.reduce((a, b) => a + b, 0);
        console.log(
          `  ✅ ${event.title} - Zone ${zoneConfig.name}: ${totalSeats} ghế (${zoneConfig.arcSeatsPerRow.length} vòng cung)`
        );
      }
    }

    // 4. Tạo một số bookings mẫu
    console.log('\n📝 Tạo bookings mẫu...');

    // Lấy 2 ghế VIP từ event1
    const vipZone = await prisma.zone.findFirst({
      where: {
        eventId: event1.id,
        name: 'VIP',
      },
    });

    const vipSeats = await prisma.seat.findMany({
      where: {
        zoneId: vipZone.id,
      },
      take: 2,
    });

    for (let i = 0; i < vipSeats.length; i++) {
      const booking = await prisma.booking.create({
        data: {
          userId: i === 0 ? customer1.id : customer2.id,
          seatId: vipSeats[i].id,
          status: i === 0 ? 'PAID' : 'PENDING',
          totalPrice: 2500000,
          qrCode: `QR${Date.now()}${i}`,
          paidAt: i === 0 ? new Date() : null,
        },
      });

      // Cập nhật trạng thái ghế
      await prisma.seat.update({
        where: { id: vipSeats[i].id },
        data: { status: 'SOLD' },
      });

      console.log(
        `  ✅ Booking ${i + 1}: ${i === 0 ? customer1.fullName : customer2.fullName} - Ghế ${vipSeats[i].label}`
      );
    }

    console.log('\n✨ Seed dữ liệu hoàn tất!\n');
    console.log('📊 Thống kê:');
    console.log('  - Users: 1 Admin + 2 Customer');
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
    console.log('\n🔐 Tài Khoản Test:');
    console.log('  Admin: admin@ticketrush.com / admin123');
    console.log('  Customer 1: cus1@gmail.com / 12345');
    console.log('  Customer 2: cus2@gmail.com / 12345');
    console.log('\n🎯 Arc Layout Mỗi Zone:');
    console.log('  VIP (2,500,000đ): A(9) → B(11)');
    console.log('  Khu A (1,500,000đ): C(13) → D(15)');
    console.log('  Khu B (800,000đ): E(17) → F(19) → G(21)');
  } catch (error) {
    console.error('❌ Lỗi seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
