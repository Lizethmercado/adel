
const { randomUUID } = require('node:crypto');
const request = require('supertest');

const ruta = '/api/insumos';
const idPrueba = randomUUID();
const mensajeComparacion = 'No hay otro proveedor para comparar';

let app;
let prisma;
let negocioA;
let negocioB;
let tokenA;

async function crearNegocioConUsuario(etiqueta) {
  return prisma.negocio.create({
    data: {
      nombre: `Negocio Comparacion ${etiqueta} ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: `Usuario Comparacion ${etiqueta}`,
          correo: `comparacion-${etiqueta}-${idPrueba}@example.com`,
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

function consultarComparacion(token, insumoId) {
  return request(app)
    .get(`${ruta}/${insumoId}/comparacion`)
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

describe('Comparación de precios (HU-13)', () => {
  test('HU-13: compara los últimos precios de proveedores y los ordena de menor a mayor', async () => {
    const proveedorA = await crearProveedor(negocioA.id, 'Proveedor A');
    const proveedorB = await crearProveedor(negocioA.id, 'Proveedor B');
    const harina = await crearInsumo(negocioA.id, 'Harina');

    await registrarCompra(
      negocioA.id, proveedorA.id, harina.id, '2026-11-01', 4000,
    );
    await registrarCompra(
      negocioA.id, proveedorA.id, harina.id, '2026-11-15', 4500,
    );
    await registrarCompra(
      negocioA.id, proveedorB.id, harina.id, '2026-11-10', 4200,
    );

    const { body } = await consultarComparacion(tokenA, harina.id)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(body.insumo).toEqual({
      id: harina.id,
      nombre: 'Harina',
      unidad: 'kg',
    });

    expect(body.proveedores).toHaveLength(2);
    expect(body.proveedores[0]).toMatchObject({
      proveedorId: proveedorB.id,
      nombre: 'Proveedor B',
      ultimoPrecio: 4200,
      fecha: '2026-11-10',
    });
    expect(body.proveedores[1]).toMatchObject({
      proveedorId: proveedorA.id,
      nombre: 'Proveedor A',
      ultimoPrecio: 4500,
      fecha: '2026-11-15',
    });
    expect(body.mensaje).toBeUndefined();
  });

  test('HU-13: excluye proveedores inactivos', async () => {
    const proveedorActivo = await crearProveedor(negocioA.id, 'Proveedor Activo');
    const proveedorInactivo = await crearProveedor(negocioA.id, 'Proveedor Inactivo');
    const harina = await crearInsumo(negocioA.id, 'Harina');

    await prisma.proveedor.update({
      where: { id: proveedorInactivo.id },
      data: { estado: 'INACTIVO' },
    });

    await registrarCompra(
      negocioA.id, proveedorActivo.id, harina.id, '2026-11-10', 4000,
    );
    await registrarCompra(
      negocioA.id, proveedorInactivo.id, harina.id, '2026-11-15', 3000,
    );

    const { body } = await consultarComparacion(tokenA, harina.id)
      .expect(200);

    expect(body.proveedores).toHaveLength(1);
    expect(body.proveedores[0].proveedorId).toBe(proveedorActivo.id);
    expect(body.mensaje).toBe(mensajeComparacion);
  });

  test('HU-13: calcula el precio promedio ponderado cuando la última compra tiene varias líneas', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor Multilínea');
    const otroProveedor = await crearProveedor(negocioA.id, 'Proveedor B');
    const harina = await crearInsumo(negocioA.id, 'Harina');

    await prisma.compra.create({
      data: {
        negocioId: negocioA.id,
        proveedorId: proveedor.id,
        fecha: new Date('2026-11-15T00:00:00.000Z'),
        total: 16800,
        detalles: {
          create: [
            { insumoId: harina.id, cantidad: 2, precioUnitario: 4000 },
            { insumoId: harina.id, cantidad: 2, precioUnitario: 4400 },
          ],
        },
      },
    });

    await registrarCompra(
      negocioA.id, otroProveedor.id, harina.id, '2026-11-10', 5000,
    );

    const { body } = await consultarComparacion(tokenA, harina.id)
      .expect(200);

    const resultado = body.proveedores.find(
      (item) => item.proveedorId === proveedor.id,
    );

    expect(resultado.ultimoPrecio).toBe(4200);
  });

  test('HU-13: muestra el mensaje cuando solo existe un proveedor con compras', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor Único');
    const harina = await crearInsumo(negocioA.id, 'Harina');

    await registrarCompra(
      negocioA.id, proveedor.id, harina.id, '2026-11-10', 4000,
    );

    const { body } = await consultarComparacion(tokenA, harina.id)
      .expect(200);

    expect(body.proveedores).toHaveLength(1);
    expect(body.mensaje).toBe(mensajeComparacion);
  });

  test('HU-13: muestra el mensaje cuando el insumo no tiene compras', async () => {
    const harina = await crearInsumo(negocioA.id, 'Harina sin compras');

    const { body } = await consultarComparacion(tokenA, harina.id)
      .expect(200);

    expect(body.proveedores).toEqual([]);
    expect(body.mensaje).toBe(mensajeComparacion);
  });

  test('R-01: rechaza con 404 un insumo de otro negocio o un ID fuera de rango', async () => {
    const insumoAjeno = await crearInsumo(negocioB.id, 'Harina Negocio B');

    await consultarComparacion(tokenA, insumoAjeno.id).expect(404);
    await consultarComparacion(tokenA, 999999999999).expect(404);
  });

  test('R-01: sin sesión responde 401', async () => {
    await request(app)
      .get(`${ruta}/1/comparacion`)
      .expect(401);
  });
});
