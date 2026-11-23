const { randomUUID } = require('node:crypto');
const request = require('supertest');

const ruta = '/api/compras';
const idPrueba = randomUUID();

let app;
let prisma;
let negocioA;
let negocioB;
let tokenA;

async function crearNegocioConUsuario(etiqueta) {
  return prisma.negocio.create({
    data: {
      nombre: `Negocio Compras ${etiqueta} ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: `Usuario Compras ${etiqueta}`,
          correo: `compras-${etiqueta}-${idPrueba}@example.com`,
          contrasenaHash: 'hash-de-prueba',
        },
      },
    },
    include: { usuario: true },
  });
}

async function crearInsumo(negocioId, nombre, cantidadActual = 10, cantidadMinima = 2) {
  return prisma.insumo.create({
    data: {
      negocioId,
      nombre,
      nombreNormalizado: `${nombre.trim().toLowerCase()}-${randomUUID().slice(0, 8)}`,
      unidad: 'kg',
      cantidadActual,
      cantidadMinima,
    },
  });
}

function crearProveedor(negocioId, nombre, estado = 'ACTIVO') {
  return prisma.proveedor.create({ data: { negocioId, nombre, estado } });
}

function contarCompras(negocioId) {
  return prisma.compra.count({ where: { negocioId } });
}

async function cantidadDe(insumoId) {
  const insumo = await prisma.insumo.findUnique({ where: { id: insumoId } });
  return Number(insumo.cantidadActual);
}

function comprar(token, cuerpo) {
  return request(app)
    .post(ruta)
    .set('Authorization', `Bearer ${token}`)
    .send(cuerpo);
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
      await prisma.compra.deleteMany({ where: { negocioId: { in: ids } } });
      await prisma.insumo.deleteMany({ where: { negocioId: { in: ids } } });
      await prisma.proveedor.deleteMany({ where: { negocioId: { in: ids } } });
      await prisma.usuario.deleteMany({ where: { negocioId: { in: ids } } });
      await prisma.negocio.deleteMany({ where: { id: { in: ids } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('Compras (HU-10)', () => {
  test('HU-10 escenario 1: registra la compra con su total (2 x 4.000 + 1 x 3.000 = 11.000)', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Distribuidora El Sol');
    const harina = await crearInsumo(negocioA.id, 'Harina de trigo');
    const queso = await crearInsumo(negocioA.id, 'Queso costeño');

    const { body } = await comprar(tokenA, {
      proveedorId: proveedor.id,
      fecha: '2026-11-22',
      detalles: [
        { insumoId: harina.id, cantidad: 2, precioUnitario: 4000 },
        { insumoId: queso.id, cantidad: 1, precioUnitario: 3000 },
      ],
    })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(body.mensaje).toEqual(expect.any(String));
    expect(body.compra).toMatchObject({
      id: expect.any(Number),
      proveedorId: proveedor.id,
    });
    expect(Number(body.compra.total)).toBe(11000);
    expect(body.compra.detalles).toHaveLength(2);

    const guardada = await prisma.compra.findUnique({
      where: { id: body.compra.id },
      include: { detalles: true },
    });
    expect(guardada.negocioId).toBe(negocioA.id);
    expect(Number(guardada.total)).toBe(11000);
    expect(guardada.detalles).toHaveLength(2);
  });

  test('HU-10 escenario 1: suma la cantidad comprada al inventario (5 + 10 = 15)', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor Inventario');
    const arroz = await crearInsumo(negocioA.id, 'Arroz', 5, 2);

    await comprar(tokenA, {
      proveedorId: proveedor.id,
      detalles: [{ insumoId: arroz.id, cantidad: 10, precioUnitario: 4000 }],
    }).expect(201);

    expect(await cantidadDe(arroz.id)).toBe(15);
  });

  test('HU-10 escenario 2: rechaza cantidad o precio en cero o negativos y no modifica el inventario', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor Validación');
    const azucar = await crearInsumo(negocioA.id, 'Azúcar', 8, 2);
    const comprasAntes = await contarCompras(negocioA.id);

    const casos = [
      { cantidad: 0, precioUnitario: 1000 },
      { cantidad: -3, precioUnitario: 1000 },
      { cantidad: 2, precioUnitario: 0 },
      { cantidad: 2, precioUnitario: -500 },
    ];

    for (const caso of casos) {
      const { body } = await comprar(tokenA, {
        proveedorId: proveedor.id,
        detalles: [{ insumoId: azucar.id, ...caso }],
      })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(body.mensaje).toEqual(expect.any(String));
      expect(Array.isArray(body.campos)).toBe(true);
    }

    expect(await contarCompras(negocioA.id)).toBe(comprasAntes);
    expect(await cantidadDe(azucar.id)).toBe(8);
  });

  test('HU-10 escenario 2: rechaza una compra sin detalles y no registra ninguna compra', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor Sin Detalles');
    const comprasAntes = await contarCompras(negocioA.id);

    const { body } = await comprar(tokenA, {
      proveedorId: proveedor.id,
      detalles: [],
    })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.campos).toEqual(expect.arrayContaining(['detalles']));
    expect(await contarCompras(negocioA.id)).toBe(comprasAntes);
  });

  test('HU-10 escenario 2: rechaza una compra sin proveedorId con 400 y no modifica el inventario', async () => {
    const aceite = await crearInsumo(negocioA.id, 'Aceite de cocina', 7, 2);
    const comprasAntes = await contarCompras(negocioA.id);

    const { body } = await comprar(tokenA, {
      detalles: [{ insumoId: aceite.id, cantidad: 3, precioUnitario: 9000 }],
    })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.mensaje).toEqual(expect.any(String));
    expect(body.campos).toEqual(expect.arrayContaining(['proveedorId']));
    expect(await contarCompras(negocioA.id)).toBe(comprasAntes);
    expect(await cantidadDe(aceite.id)).toBe(7);
  });

  test('HU-10 escenario 3: rechaza un proveedor de otro negocio y no registra la compra', async () => {
    const proveedorAjeno = await crearProveedor(negocioB.id, 'Proveedor Negocio B');
    const sal = await crearInsumo(negocioA.id, 'Sal refinada', 4, 1);
    const comprasAntes = await contarCompras(negocioA.id);

    const { body } = await comprar(tokenA, {
      proveedorId: proveedorAjeno.id,
      detalles: [{ insumoId: sal.id, cantidad: 5, precioUnitario: 1200 }],
    })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.campos).toEqual(expect.arrayContaining(['proveedorId']));
    expect(await contarCompras(negocioA.id)).toBe(comprasAntes);
    expect(await cantidadDe(sal.id)).toBe(4);
  });

  test('HU-10 escenario 4: rechaza un insumo de otro negocio y no deja cambios parciales', async () => {
    const proveedor = await crearProveedor(negocioA.id, 'Proveedor Atomicidad');
    const insumoPropio = await crearInsumo(negocioA.id, 'Aceite vegetal', 6, 2);
    const insumoAjeno = await crearInsumo(negocioB.id, 'Aceite Negocio B', 12, 2);
    const comprasAntes = await contarCompras(negocioA.id);

    const { body } = await comprar(tokenA, {
      proveedorId: proveedor.id,
      detalles: [
        { insumoId: insumoPropio.id, cantidad: 4, precioUnitario: 9000 },
        { insumoId: insumoAjeno.id, cantidad: 3, precioUnitario: 9000 },
      ],
    })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.campos).toEqual(expect.arrayContaining(['detalles']));
    expect(await contarCompras(negocioA.id)).toBe(comprasAntes);
    expect(await cantidadDe(insumoPropio.id)).toBe(6);
    expect(await cantidadDe(insumoAjeno.id)).toBe(12);
  });

  test('HU-10 escenario 3: rechaza un proveedor inactivo y no registra la compra', async () => {
    const proveedorInactivo = await crearProveedor(
      negocioA.id,
      'Proveedor Inactivo',
      'INACTIVO',
    );
    const harina = await crearInsumo(negocioA.id, 'Harina integral', 9, 2);
    const comprasAntes = await contarCompras(negocioA.id);

    const { body } = await comprar(tokenA, {
      proveedorId: proveedorInactivo.id,
      detalles: [{ insumoId: harina.id, cantidad: 5, precioUnitario: 3000 }],
    })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.campos).toEqual(expect.arrayContaining(['proveedorId']));
    expect(await contarCompras(negocioA.id)).toBe(comprasAntes);
    expect(await cantidadDe(harina.id)).toBe(9);
  });

  test('R-01: sin sesión se responde 401', async () => {
    await request(app)
      .post(ruta)
      .send({
        proveedorId: 1,
        detalles: [{ insumoId: 1, cantidad: 1, precioUnitario: 1000 }],
      })
      .expect(401);
  });
});
