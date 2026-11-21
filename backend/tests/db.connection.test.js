require('../src/config/env');

// Sin DATABASE_URL (por ejemplo, en el pipeline) las pruebas se omiten
const hayBaseDeDatos = Boolean(process.env.DATABASE_URL);
const describeBD = hayBaseDeDatos ? describe : describe.skip;

describeBD('Conexión a PostgreSQL con Prisma', () => {
    let prisma;

    beforeAll(() => {
        prisma = require('../src/config/prisma');
    });

    afterAll(async () => {
        if (prisma) {
            await prisma.$disconnect();
        }
    });

    test('Debe responder una consulta simple a la base de datos', async () => {
        const resultado = await prisma.$queryRaw`SELECT 1 AS ok`;

        expect(Number(resultado[0].ok)).toBe(1);
    });

    test('Debe tener aplicadas las tablas de la migración inicial', async () => {
        const tablas = await prisma.$queryRaw`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
        `;
        const nombres = tablas.map((tabla) => tabla.table_name);

        expect(nombres).toEqual(
            expect.arrayContaining([
                'Negocio',
                'Usuario',
                'Insumo',
                'Proveedor',
                'Compra',
                'DetalleCompra'
            ])
        );
    });
});