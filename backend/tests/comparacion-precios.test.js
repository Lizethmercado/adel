const { randomUUID } = require('node:crypto');
const request = require('supertest');

const idPrueba = randomUUID();
let app;
let prisma;
let negocioA;
let negocioB;
let tokenA;
let tokenB;

function crearNegocioConUsuario(etiqueta) {
  return prisma.negocio.create({
    data: {
      nombre: `Negocio HU-13 ${etiqueta} ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: `Usuario HU-13 ${etiqueta}`,
          correo: `hu13-${etiqueta}-${idPrueba}@example.com`,
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
      nombreNormalizado: nombre.toLowerCase(),
      unidad: 'kg',
      cantidadActual: 10,
      cantidadMinima: 2,
    },
  });
}

function crearProveedor(negocioId, nombre, estado = 'ACTIVO') {
  return prisma.proveedor.create({
    data: { negocioId, nombre, estado },
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
    .get(`/api/insumos/${insumoId}/comparacion`)
    .set('Authorization', `Bearer ${token}`);
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL;

  if (!url || new URL(url).pathname !== '/adel_test') {
    throw new Error('Configura DATABASE_URL para usar adel_test.');
  }

  prisma = require('../src/config/prisma');

  const [conexion] = await prisma.$queryRaw`
    SELECT current_database() AS nombre
  `;

  if (conexion.nombre !== 'adel_test') {
    throw new Error('La conexión de pruebas debe usar adel_test.');
  }

  const { crearToken } = require('../src/config/session');
  app = require('../src/app');

  negocioA = await crearNegocioConUsuario('a');
  negocioB = await crearNegocioConUsuario('b');
  tokenA = crearToken(negocioA.usuario.id);
  tokenB = crearToken(negocioB.usuario.id);
});

afterAll(async () => {
  if (!prisma) return;

  try {
    const ids = [negocioA?.id, negocioB?.id].filter(Boolean);

    if (ids.length === 0) return;

    await prisma.$transaction([
      prisma.detalleCompra.deleteMany({
        where: { compra: { negocioId: { in: ids } } },
      }),
      prisma.compra.deleteMany({
        where: { negocioId: { in: ids } },
      }),
      prisma.insumo.deleteMany({
        where: { negocioId: { in: ids } },
      }),
      prisma.proveedor.deleteMany({
        where: { negocioId: { in: ids } },
      }),
      prisma.usuario.deleteMany({
        where: { negocioId: { in: ids } },
      }),
      prisma.negocio.deleteMany({
        where: { id: { in: ids } },
      }),
    ]);
  } finally {
    await prisma.$disconnect();
  }
});

describe('Comparación del último precio por proveedor (HU-13)', () => {
  test('HU-13 escenario 1: ordena a los proveedores activos por su último precio', async () => {
    const harina = await crearInsumo(negocioA.id, 'Harina');
    const proveedorA = await crearProveedor(negocioA.id, 'Proveedor A');
    const proveedorB = await crearProveedor(negocioA.id, 'Proveedor B');
    const proveedorC = await crearProveedor(negocioA.id, 'Proveedor C');
    const inactivo = await crearProveedor(negocioA.id, 'Proveedor inactivo');

    await registrarCompra(negocioA.id, proveedorA.id, harina.id, '2026-11-15', 5000);
    await registrarCompra(negocioA.id, proveedorB.id, harina.id, '2026-11-12', 4200);
    await registrarCompra(negocioA.id, proveedorC.id, harina.id, '2026-11-14', 4600);

    // Esta compra se inserta después, pero su fecha es anterior.
    await registrarCompra(negocioA.id, proveedorA.id, harina.id, '2026-11-01', 3000);

    await registrarCompra(negocioA.id, inactivo.id, harina.id, '2026-11-16', 1000);
    await prisma.proveedor.update({
      where: { id: inactivo.id },
      data: { estado: 'INACTIVO' },
    });

    const { body } = await consultarComparacion(tokenA, harina.id)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(body.insumo).toMatchObject({
      id: harina.id,
      nombre: 'Harina',
      unidad: 'kg',
    });

    expect(body.proveedores).toHaveLength(3);
    expect(body.proveedores).toMatchObject([
      {
        proveedorId: proveedorB.id,
        nombre: 'Proveedor B',
        fecha: '2026-11-12',
        ultimoPrecio: 4200,
      },
      {
        proveedorId: proveedorC.id,
        nombre: 'Proveedor C',
        fecha: '2026-11-14',
        ultimoPrecio: 4600,
      },
      {
        proveedorId: proveedorA.id,
        nombre: 'Proveedor A',
        fecha: '2026-11-15',
        ultimoPrecio: 5000,
      },
    ]);
  });

  test('HU-13 escenario 2: informa si no hay compras y muestra el precio si hay un solo proveedor', async () => {
    const sal = await crearInsumo(negocioA.id, 'Sal');
    const azucar = await crearInsumo(negocioA.id, 'Azúcar');
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor único');

    await registrarCompra(negocioA.id, proveedor.id, azucar.id, '2026-11-04', 3500);
    await registrarCompra(negocioA.id, proveedor.id, azucar.id, '2026-11-18', 3800);

    const sinCompras = await consultarComparacion(tokenA, sal.id)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(sinCompras.body.insumo.id).toBe(sal.id);
    expect(sinCompras.body.proveedores).toEqual([]);
    expect(sinCompras.body.mensaje).toEqual(expect.any(String));
    expect(sinCompras.body.mensaje.trim()).not.toBe('');

    const unProveedor = await consultarComparacion(tokenA, azucar.id)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(unProveedor.body.insumo.id).toBe(azucar.id);
    expect(unProveedor.body.proveedores).toHaveLength(1);
    expect(unProveedor.body.proveedores[0]).toMatchObject({
      proveedorId: proveedor.id,
      nombre: 'Proveedor único',
      fecha: '2026-11-18',
      ultimoPrecio: 3800,
    });
  });

  test('HU-13 escenario 3 (R-01): cada negocio solo consulta sus propios insumos y precios', async () => {
    const arrozA = await crearInsumo(negocioA.id, 'Arroz');
    const arrozB = await crearInsumo(negocioB.id, 'Arroz');
    const proveedorA = await crearProveedor(negocioA.id, 'Proveedor del negocio A');
    const proveedorB = await crearProveedor(negocioB.id, 'Proveedor del negocio B');

    await registrarCompra(negocioA.id, proveedorA.id, arrozA.id, '2026-11-10', 4500);
    await registrarCompra(negocioB.id, proveedorB.id, arrozB.id, '2026-11-16', 1000);

    const respuestaA = await consultarComparacion(tokenA, arrozA.id).expect(200);
    expect(respuestaA.body.insumo.id).toBe(arrozA.id);
    expect(respuestaA.body.proveedores).toHaveLength(1);
    expect(respuestaA.body.proveedores[0]).toMatchObject({
      proveedorId: proveedorA.id,
      ultimoPrecio: 4500,
    });

    const respuestaB = await consultarComparacion(tokenB, arrozB.id).expect(200);
    expect(respuestaB.body.insumo.id).toBe(arrozB.id);
    expect(respuestaB.body.proveedores).toHaveLength(1);
    expect(respuestaB.body.proveedores[0]).toMatchObject({
      proveedorId: proveedorB.id,
      ultimoPrecio: 1000,
    });

    await consultarComparacion(tokenA, arrozB.id).expect(404);
  });
});