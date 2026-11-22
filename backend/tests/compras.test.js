const { randomUUID } = require('node:crypto');
const request = require('supertest');

const ruta = '/api/compras';
const idPrueba = randomUUID();

let app;
let prisma;
let negocioA;
let negocioB;
let tokenA;
let tokenB;

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
  tokenB = crearToken(negocioB.usuario.id);
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
  test('HU-10 escenarios 1 y 2: registra la compra con su total y suma las cantidades al inventario en una transacción', async () => {
    const proveedor = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Distribuidora El Sol' },
    });
    const harina = await crearInsumo(negocioA.id, 'Harina de trigo', 5, 2);
    const queso = await crearInsumo(negocioA.id, 'Queso costeño', 3.5, 1);

    const { body } = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        proveedorId: proveedor.id,
        fecha: '2026-11-22',
        detalles: [
          { insumoId: harina.id, cantidad: 10, precioUnitario: 3200 },
          { insumoId: queso.id, cantidad: 2.5, precioUnitario: 14000 },
        ],
      })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(body.mensaje).toEqual(expect.any(String));
    expect(body.compra).toMatchObject({
      id: expect.any(Number),
      proveedorId: proveedor.id,
    });
    expect(Number(body.compra.total)).toBe(67000);
    expect(body.compra.detalles).toHaveLength(2);

    const harinaActualizada = await prisma.insumo.findUnique({
      where: { id: harina.id },
    });
    const quesoActualizado = await prisma.insumo.findUnique({
      where: { id: queso.id },
    });

    expect(Number(harinaActualizada.cantidadActual)).toBe(15);
    expect(Number(quesoActualizado.cantidadActual)).toBe(6);
  });

  test('HU-10 escenario 3: rechaza datos inválidos o vacíos y no altera el inventario', async () => {
    const proveedor = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Proveedor Validación' },
    });
    const azucar = await crearInsumo(negocioA.id, 'Azúcar', 8, 2);

    const comprasAntes = await prisma.compra.count({
      where: { negocioId: negocioA.id },
    });

    // Sin detalles
    const resVacio = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ proveedorId: proveedor.id, detalles: [] })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(resVacio.body.campos).toEqual(expect.arrayContaining(['detalles']));

    // Cantidad y precio inválidos
    const resInvalidos = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        proveedorId: proveedor.id,
        detalles: [{ insumoId: azucar.id, cantidad: 0, precioUnitario: -500 }],
      })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(resInvalidos.body.mensaje).toEqual(expect.any(String));
    expect(Array.isArray(resInvalidos.body.campos)).toBe(true);

    const comprasDespues = await prisma.compra.count({
      where: { negocioId: negocioA.id },
    });
    const azucarIntacta = await prisma.insumo.findUnique({
      where: { id: azucar.id },
    });

    expect(comprasDespues).toBe(comprasAntes);
    expect(Number(azucarIntacta.cantidadActual)).toBe(8);
  });

  test('HU-10 escenario 4: rechaza un proveedor inactivo o de otro negocio y no altera el inventario', async () => {
    const proveedorInactivo = await prisma.proveedor.create({
      data: {
        negocioId: negocioA.id,
        nombre: 'Proveedor Inactivo',
        estado: 'INACTIVO',
      },
    });
    const proveedorAjeno = await prisma.proveedor.create({
      data: {
        negocioId: negocioB.id,
        nombre: 'Proveedor Negocio B',
        estado: 'ACTIVO',
      },
    });
    const sal = await crearInsumo(negocioA.id, 'Sal refinada', 4, 1);

    const resInactivo = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        proveedorId: proveedorInactivo.id,
        detalles: [{ insumoId: sal.id, cantidad: 5, precioUnitario: 1200 }],
      })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(resInactivo.body.campos).toEqual(expect.arrayContaining(['proveedorId']));

    const resAjeno = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        proveedorId: proveedorAjeno.id,
        detalles: [{ insumoId: sal.id, cantidad: 5, precioUnitario: 1200 }],
      })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(resAjeno.body.campos).toEqual(expect.arrayContaining(['proveedorId']));

    const salIntacta = await prisma.insumo.findUnique({
      where: { id: sal.id },
    });
    expect(Number(salIntacta.cantidadActual)).toBe(4);
  });

  test('HU-10 escenario 4: rechaza un insumo de otro negocio y no deja cambios parciales', async () => {
    const proveedor = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Proveedor Atomicidad' },
    });
    const insumoPropio = await crearInsumo(negocioA.id, 'Aceite vegetal', 6, 2);
    const insumoAjeno = await crearInsumo(negocioB.id, 'Aceite Negocio B', 12, 2);

    const { body } = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        proveedorId: proveedor.id,
        detalles: [
          { insumoId: insumoPropio.id, cantidad: 4, precioUnitario: 9000 },
          { insumoId: insumoAjeno.id, cantidad: 3, precioUnitario: 9000 },
        ],
      })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.campos).toEqual(expect.arrayContaining(['detalles']));

    const propioIntacto = await prisma.insumo.findUnique({
      where: { id: insumoPropio.id },
    });
    const ajenoIntacto = await prisma.insumo.findUnique({
      where: { id: insumoAjeno.id },
    });

    expect(Number(propioIntacto.cantidadActual)).toBe(6);
    expect(Number(ajenoIntacto.cantidadActual)).toBe(12);
  });

  test('R-01: sin sesión se responde 401', async () => {
    await request(app)
      .post(ruta)
      .send({ proveedorId: 1, detalles: [{ insumoId: 1, cantidad: 1, precioUnitario: 1000 }] })
      .expect(401);
  });
});