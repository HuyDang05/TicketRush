// Purpose: Cau hinh ket noi dich vu ha tang nhu Prisma, Redis, Socket, upload hoac Swagger.
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TicketRush API',
      version: '1.0.0',
      description: 'API documentation for TicketRush backend',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js'),
  ],
});

module.exports = swaggerSpec;