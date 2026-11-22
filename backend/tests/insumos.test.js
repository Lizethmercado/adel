
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

const datosInsumo = {
  nombre: 'Queso mozzarella',
  unidad: 'kg',
  cantidadActual: 10,
  cantidadMinima: 2,
};

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
      nombre: `Negocio principal T24 ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: 'Usuario principal T24',
          correo: `principal-${idPrueba}@example.com`,
          contrasenaHash: 'hash-de-prueba',
        },
      },
    },
    include: { usuario: true },
  });

  negocioSecundario = await prisma.negocio.create({
    data: {
      nombre: `Negocio secundario T24 ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: 'Usuario secundario T24',
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

describe('POST /api/insumos (HU-03)', () => {
  test('HU-03 escenario 1: insumo registrado', async () => {
    const respuesta = await request(app)
      .post(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .send(datosInsumo)
      .expect(201)
      .expect('Content-Type', /json/);

    expect(respuesta.body).toMatchObject({
      nombre: datosInsumo.nombre,
      unidad: datosInsumo.unidad,
      perecedero: false,
    });

    const insumoGuardado = await prisma.insumo.findUnique({
      where: {
        negocioId_nombreNormalizado: {
          negocioId: negocioPrincipal.id,
          nombreNormalizado: 'queso mozzarella',
        },
      },
    });

    expect(insumoGuardado).not.toBeNull();
    expect(insumoGuardado.negocioId).toBe(negocioPrincipal.id);
    expect(insumoGuardado.perecedero).toBe(false);
  });

  test('HU-03 escenario 2: nombre duplicado', async () => {
    await prisma.insumo.create({
      data: {
        negocioId: negocioPrincipal.id,
        nombre: 'Arroz',
        nombreNormalizado: 'arroz',
        unidad: 'kg',
        cantidadActual: 5,
        cantidadMinima: 1,
      },
    });

    const respuesta = await request(app)
      .post(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .send({
        ...datosInsumo,
        nombre: 'arroz',
      })
      .expect(409)
      .expect('Content-Type', /json/);

    expect(respuesta.body.mensaje).toEqual(expect.any(String));

    const cantidad = await prisma.insumo.count({
      where: {
        negocioId: negocioPrincipal.id,
        nombreNormalizado: 'arroz',
      },
    });

    expect(cantidad).toBe(1);
  });

  test('HU-03 escenario 3: mismo nombre en otro negocio', async () => {
    await prisma.insumo.create({
      data: {
        negocioId: negocioSecundario.id,
        nombre: 'Harina',
        nombreNormalizado: 'harina',
        unidad: 'kg',
        cantidadActual: 8,
        cantidadMinima: 2,
      },
    });

    const respuesta = await request(app)
      .post(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .send({
        ...datosInsumo,
        nombre: 'Harina',
      })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(respuesta.body).toMatchObject({
      nombre: 'Harina',
    });

    const insumoPrincipal = await prisma.insumo.findUnique({
      where: {
        negocioId_nombreNormalizado: {
          negocioId: negocioPrincipal.id,
          nombreNormalizado: 'harina',
        },
      },
    });

    expect(insumoPrincipal).not.toBeNull();
    expect(insumoPrincipal.negocioId).toBe(negocioPrincipal.id);
  });

  test('HU-03 escenario 4: valores negativos', async () => {
    const respuestaActual = await request(app)
      .post(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .send({
        ...datosInsumo,
        cantidadActual: -1,
      })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(respuestaActual.body.mensaje).toMatch(/cantidadActual/i);

    const respuestaMinima = await request(app)
      .post(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .send({
        ...datosInsumo,
        nombre: 'Leche en polvo',
        cantidadMinima: -1,
      })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(respuestaMinima.body.mensaje).toMatch(/cantidadMinima/i);
  });

  test('HU-03 escenario 5: cantidad en cero', async () => {
    const respuesta = await request(app)
      .post(rutaInsumos)
      .set('Authorization', `Bearer ${tokenPrincipal}`)
      .send({
        ...datosInsumo,
        nombre: 'Aceite',
        cantidadActual: 0,
      })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(Number(respuesta.body.cantidadActual)).toBe(0);

    const insumoGuardado = await prisma.insumo.findUnique({
      where: {
        negocioId_nombreNormalizado: {
          negocioId: negocioPrincipal.id,
          nombreNormalizado: 'aceite',
        },
      },
    });

    expect(insumoGuardado).not.toBeNull();
    expect(Number(insumoGuardado.cantidadActual)).toBe(0);
  });

  test('HU-03 adicional R-01: solicitud sin token', async () => {
    await request(app)
      .post(rutaInsumos)
      .send(datosInsumo)
      .expect(401);
  });
});
