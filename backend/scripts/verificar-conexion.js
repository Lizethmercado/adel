const config = require('../src/config/env');
const prisma = require('../src/config/prisma');

async function main() {
    if (!config.databaseUrl) {
        console.error('Falta DATABASE_URL en el archivo .env');
        process.exitCode = 1;
        return;
    }

    try {
        await prisma.$queryRaw`SELECT 1`;
        const negocios = await prisma.negocio.count();

        console.log('Conexión exitosa con PostgreSQL.');
        console.log(`Negocios registrados: ${negocios}`);
    } catch (error) {
        console.error('No se pudo conectar con la base de datos.');
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();