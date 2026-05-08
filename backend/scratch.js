const prisma = require('./src/config/prisma');

async function test() {
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) throw new Error('No admin found');
    
    const e = await prisma.event.create({
      data: {
        title: 'Test Event',
        venue: 'Venue',
        date: new Date(Date.now() + 86400000),
        createdBy: admin.id,
        status: 'DRAFT'
      }
    });
    console.log('Success:', e);
  } catch(err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
