// Purpose: Cau hinh ket noi dich vu ha tang nhu Prisma, Redis, Socket, upload hoac Swagger.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
