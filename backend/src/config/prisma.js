const { PrismaClient } = require('@prisma/client');

// Una sola instancia para toda la aplicación (Node guarda en caché el módulo)
const prisma = new PrismaClient();

module.exports = prisma;