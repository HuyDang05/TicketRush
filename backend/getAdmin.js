// Purpose: File code TicketRush; doc comment gan logic ben duoi de nam vai tro va luong xu ly.
const prisma = require('./src/config/prisma');
async function getAdmin() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  console.log(admin.email);
  await prisma.$disconnect();
}
getAdmin();
