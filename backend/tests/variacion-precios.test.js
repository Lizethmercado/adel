const { randomUUID } = require('node:crypto');
const request = require('supertest');

const ruta = '/api/insumos';
const idPrueba = randomUUID();
const mensajeComparacion =
  'Se necesitan al menos dos compras al mismo proveedor para comparar';

let app;
let prisma;
let negocioA;
let negocioB;
let tokenA;

async function crearNegocioConUsuario(etiqueta) {
  return prisma.negocio.create({
    data: {
      nombre: `Negocio Variacion ${etiqueta} ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: `Usuario Variacion ${etiqueta}`,
          correo: `variacion-${etiqueta}-${idPrueba}@example.com`,
          contrasenaHash: 'hash-de-prueba',
        },
      },
    },
    include: { usuario: true },
  });
}

function crearInsumo(negocioId, nombre) {
  return prisma.insumo.create({
    data: {
      negocioId,
      nombre,
      nombreNormalizado: `${nombre.trim().toLowerCase()}-${randomUUID().slice(0, 8)}`,
      unidad: 'kg',
      cantidadActual: 10,
      cantidadMinima: 2,
    },
  });
}

function crearProveedor(negocioId, nombre) {
  return prisma.proveedor.create({
    data: { negocioId, nombre },
  });
}

function registrarCompra(negocioId, proveedorId, insumoId, fecha, precioUnitario) {
  return prisma.compra.create({
    data: {
      negocioId,
      proveedorId,
      fecha: new Date(`${fecha}T00:00:00.000Z`),
      total: precioUnitario,
      detalles: {
        create: {
          insumoId,
          cantidad: 1,
          precioUnitario,
        },
      },
    },
  });
}

function consultarVariacion(token, insumoId) {
  return request(app)
    .get(`${ruta}/${insumoId}/variacion-precios`)
    .set('Authorization', `Bearer ${token}`);
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL;

  if (!url || new URL(url).pathname !== '/adel_test') {
    throw new Error('Configura DATABASE_URL para usar adel_test.');
  }

  prisma = require('../src/config/prisma');
  const { crearToken } = require('../src/config/session');
  app = require('../src/app');

  negocioA = await crearNegocioConUsuario('A');
  negocioB = await crearNegocioConUsuario('B');
  tokenA = crearToken(negocioA.usuario.id);
});

afterAll(async () => {
  if (!prisma) {
    return;
  }

  try {
    const ids = [negocioA?.id, negocioB?.id].filter(Boolean);

    if (ids.length > 0) {
      await prisma.detalleCompra.deleteMany({
        where: { compra: { negocioId: { in: ids } } },
      });
      await prisma.compra.deleteMany({
        where: { negocioId: { in: ids } },
      });
      await prisma.insumo.deleteMany({
        where: { negocioId: { in: ids } },
      });
      await prisma.proveedor.deleteMany({
        where: { negocioId: { in: ids } },
      });
      await prisma.usuario.deleteMany({
        where: { negocioId: { in: ids } },
      });
      await prisma.negocio.deleteMany({
        where: { id: { in: ids } },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('Variación de precios (HU-12)', () => {
  test('HU-12 escenario 1: calcula la variación entre compras del mismo proveedor', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor A');
    const harina = await crearInsumo(negocioA.id, 'Harina');

    await registrarCompra(
      negocioA.id,
      proveedor.id,
      harina.id,
      '2026-11-01',
      4000,
    );

    await registrarCompra(
      negocioA.id,
      proveedor.id,
      harina.id,
      '2026-11-15',
      4400,
    );

    const { body } = await consultarVariacion(tokenA, harina.id)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(body.insumo).toEqual({
      id: harina.id,
      nombre: 'Harina',
      unidad: 'kg',
    });

    expect(body.proveedores).toHaveLength(1);
    expect(body.proveedores[0].proveedorId).toBe(proveedor.id);
    expect(body.proveedores[0].proveedor).toBe('Proveedor A');
    expect(body.proveedores[0].compras).toHaveLength(2);

    expect(body.proveedores[0].compras[0]).toMatchObject({
      fecha: '2026-11-01',
      precioUnitario: 4000,
      variacionPorcentual: null,
    });

    expect(body.proveedores[0].compras[1]).toMatchObject({
      fecha: '2026-11-15',
      precioUnitario: 4400,
      variacionPorcentual: 10,
    });

    expect(body.mensaje).toBeUndefined();
  });

  test('HU-12 escenario 2: no calcula variación entre proveedores distintos', async () => {
    const proveedorA = await crearProveedor(negocioA.id, 'Proveedor A');
    const proveedorB = await crearProveedor(negocioA.id, 'Proveedor B');
    const harina = await crearInsumo(negocioA.id, 'Harina');

    await registrarCompra(
      negocioA.id,
      proveedorA.id,
      harina.id,
      '2026-11-01',
      4000,
    );

    await registrarCompra(
      negocioA.id,
      proveedorB.id,
      harina.id,
      '2026-11-15',
      5000,
    );

    const { body } = await consultarVariacion(tokenA, harina.id)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(body.proveedores).toHaveLength(2);

    const historialA = body.proveedores.find(
      (item) => item.proveedorId === proveedorA.id,
    );
    const historialB = body.proveedores.find(
      (item) => item.proveedorId === proveedorB.id,
    );

    expect(historialA.compras).toHaveLength(1);
    expect(historialA.compras[0].variacionPorcentual).toBeNull();

    expect(historialB.compras).toHaveLength(1);
    expect(historialB.compras[0].variacionPorcentual).toBeNull();

    expect(body.mensaje).toBe(mensajeComparacion);
  });

  test('HU-12 escenario 3: muestra el mensaje cuando existe una sola compra', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor Único');
    const harina = await crearInsumo(negocioA.id, 'Harina');

    await registrarCompra(
      negocioA.id,
      proveedor.id,
      harina.id,
      '2026-11-01',
      4000,
    );

    const { body } = await consultarVariacion(tokenA, harina.id)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(body.insumo).toEqual({
      id: harina.id,
      nombre: 'Harina',
      unidad: 'kg',
    });

    expect(body.proveedores).toHaveLength(1);
    expect(body.proveedores[0].compras).toHaveLength(1);
    expect(body.proveedores[0].compras[0].variacionPorcentual).toBeNull();
    expect(body.mensaje).toBe(mensajeComparacion);
  });
});
