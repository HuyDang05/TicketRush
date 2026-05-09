const prisma = require('./src/config/prisma');

async function test() {
  try {
    await prisma.event.create({
      data: {
        title: undefined,
        venue: 'Venue',
        date: new Date(Date.now() + 86400000),
        createdBy: '1ed1fdcb-e92c-4597-9928-ef0d45ae9c1e',
        status: 'DRAFT'
      }
    });
  } catch(err) {
    console.error('Error caught:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
