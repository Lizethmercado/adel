
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const { crearToken } = require('../src/config/session');

const rutaInsumos = '/api/insumos';
const idPrueba = randomUUID();

let app;
let prisma;
let negocioPrincipal;
let negocioSecundario;
let tokenPrincipal;

beforeAll(async () => {
  const url = process.env.DATABASE_URL;

  if (!url || new URL(url).pathname !== '/adel_test') {
    throw new Error('Configura DATABASE_URL para usar adel_test.');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('Configura JWT_SECRET para ejecutar las pruebas.');
  }

  prisma = require('../src/config/prisma');

  const [conexion] = await prisma.$queryRaw`
    SELECT current_database() AS nombre
  `;

  if (conexion.nombre !== 'adel_test') {
    throw new Error('La conexión de pruebas debe usar adel_test.');
  }

  app = require('../src/app');

  negocioPrincipal = await prisma.negocio.create({
    data: {
      nombre: `Negocio principal T30 ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: 'Usuario principal T30',
          correo: `principal-${idPrueba}@example.com`,
          contrasenaHash: 'hash-de-prueba',
        },
      },
    },
    include: { usuario: true },
  });

  negocioSecundario = await prisma.negocio.create({
    data: {
      nombre: `Negocio secundario T30 ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: 'Usuario secundario T30',
          correo: `secundario-${idPrueba}@example.com`,
          contrasenaHash: 'hash-de-prueba',
        },
      },
    },
    include: { usuario: true },
  });

  tokenPrincipal = crearToken(negocioPrincipal.usuario.id);
});

afterAll(async () => {
  if (!prisma) return;

  try {
    const negocioIds = [
      negocioPrincipal?.id,
      negocioSecundario?.id,
    ].filter(Boolean);

    if (negocioIds.length) {
      await prisma.$transaction([
        prisma.insumo.deleteMany({
          where: { negocioId: { in: negocioIds } },
        }),
        prisma.usuario.deleteMany({
          where: { negocioId: { in: negocioIds } },
        }),
        prisma.negocio.deleteMany({
          where: { id: { in: negocioIds } },
        }),
      ]);
    }
  } finally {
    await prisma.$disconnect();
  }
});

async function crearInsumo(negocioId, datos) {
  return prisma.insumo.create({
    data: {
      negocioId,
      nombre: datos.nombre,
      nombreNormalizado: datos.nombre.toLowerCase(),
      unidad: datos.unidad,
      cantidadActual: datos.cantidadActual,
      cantidadMinima: datos.cantidadMinima,
    },
  });
}

describe('GET /api/insumos (HU-07)', () => {
  beforeEach(async () => {
    await prisma.insumo.deleteMany({
      where: {
        negocioId: {
          in: [negocioPrincipal.id, negocioSecundario.id],
        },
      },
    });
  });

  test('HU-07 escenario 1: consultar insumos registrados', async () => {
    await crearInsumo(negocioPrincipal.id, {
      nombre: 'Harina',
      unidad: 'kg',
      cantidadActual: 10,
      cantidadMinima: 2,
    });

    await crearInsumo(negocioPrincipal.id, {
      nombre: 'Leche',
      unidad: 'litros',
      cantidadActual: 5,
      cantidadMinima: 1,
    });

    const respuesta = await request(app)
      .get(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(respuesta.body).toHaveProperty('insumos');
    expect(respuesta.body.insumos).toHaveLength(2);

    const harina = respuesta.body.insumos.find(
      (insumo) => insumo.nombre === 'Harina'
    );

    const leche = respuesta.body.insumos.find(
      (insumo) => insumo.nombre === 'Leche'
    );

    expect(harina).toBeDefined();
    expect(leche).toBeDefined();

    expect(harina).toMatchObject({
      unidad: 'kg',
    });
    expect(Number(harina.cantidadActual)).toBe(10);
    expect(Number(harina.cantidadMinima)).toBe(2);

    expect(leche).toMatchObject({
      unidad: 'litros',
    });
    expect(Number(leche.cantidadActual)).toBe(5);
    expect(Number(leche.cantidadMinima)).toBe(1);
  });

  test('HU-07 escenario 2: consultar únicamente insumos del propio negocio', async () => {
    await crearInsumo(negocioPrincipal.id, {
      nombre: 'Arroz',
      unidad: 'kg',
      cantidadActual: 8,
      cantidadMinima: 2,
    });

    await crearInsumo(negocioSecundario.id, {
      nombre: 'Azúcar',
      unidad: 'kg',
      cantidadActual: 12,
      cantidadMinima: 3,
    });

    const respuesta = await request(app)
      .get(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(respuesta.body.insumos).toHaveLength(1);
    expect(respuesta.body.insumos[0].nombre).toBe('Arroz');
    expect(respuesta.body.insumos[0].nombre).not.toBe('Azúcar');
  });

  test('HU-07 escenario 3: consultar cantidades actuales y mínimas', async () => {
    await crearInsumo(negocioPrincipal.id, {
      nombre: 'Harina',
      unidad: 'kg',
      cantidadActual: 1,
      cantidadMinima: 2,
    });

    await crearInsumo(negocioPrincipal.id, {
      nombre: 'Queso',
      unidad: 'kg',
      cantidadActual: 2,
      cantidadMinima: 2,
    });

    await crearInsumo(negocioPrincipal.id, {
      nombre: 'Aceite',
      unidad: 'litros',
      cantidadActual: 5,
      cantidadMinima: 2,
    });

    const respuesta = await request(app)
      .get(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(respuesta.body.insumos).toHaveLength(3);

    const harina = respuesta.body.insumos.find(
      (insumo) => insumo.nombre === 'Harina'
    );

    const queso = respuesta.body.insumos.find(
      (insumo) => insumo.nombre === 'Queso'
    );

    const aceite = respuesta.body.insumos.find(
      (insumo) => insumo.nombre === 'Aceite'
    );

    expect(harina).toBeDefined();
    expect(queso).toBeDefined();
    expect(aceite).toBeDefined();

    expect(Number(harina.cantidadActual)).toBeLessThan(
      Number(harina.cantidadMinima)
    );

    expect(Number(queso.cantidadActual)).toBe(
      Number(queso.cantidadMinima)
    );

    expect(Number(aceite.cantidadActual)).toBeGreaterThan(
      Number(aceite.cantidadMinima)
    );
  });

  test('HU-07 escenario 4: consultar inventario vacío', async () => {
    const respuesta = await request(app)
      .get(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(respuesta.body).toEqual({
      insumos: [],
    });
  });

  test('HU-07 adicional R-01: consultar inventario sin sesión', async () => {
    await request(app)
      .get(rutaInsumos)
      .expect(401);
  });
});
