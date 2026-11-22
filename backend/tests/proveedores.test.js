const { randomUUID } = require('node:crypto');
const request = require('supertest');

const ruta = '/api/proveedores';
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
      nombre: `Negocio ${etiqueta} ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: `Usuario ${etiqueta}`,
          correo: `proveedores-${etiqueta}-${idPrueba}@example.com`,
          contrasenaHash: 'hash-de-prueba',
        },
      },
    },
    include: { usuario: true },
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
      await prisma.compra.deleteMany({ where: { negocioId: { in: ids } } });
      await prisma.proveedor.deleteMany({ where: { negocioId: { in: ids } } });
      await prisma.usuario.deleteMany({ where: { negocioId: { in: ids } } });
      await prisma.negocio.deleteMany({ where: { id: { in: ids } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('Proveedores (HU-09)', () => {
  test('HU-09 escenario 1: registra un proveedor activo en el negocio de la sesión', async () => {
    const { body } = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nombre: 'Distribuidora Norte', telefono: '3001234567' })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(body.proveedor).toMatchObject({
      nombre: 'Distribuidora Norte',
      telefono: '3001234567',
      estado: 'ACTIVO',
    });

    const guardado = await prisma.proveedor.findUnique({
      where: { id: body.proveedor.id },
    });
    expect(guardado.negocioId).toBe(negocioA.id);
  });

  test('HU-09 escenario 2: rechaza un nombre vacío y no guarda nada', async () => {
    const antes = await prisma.proveedor.count({
      where: { negocioId: negocioA.id },
    });

    const { body } = await request(app)
      .post(ruta)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nombre: '   ', telefono: '3001234567' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.mensaje).toEqual(expect.any(String));
    expect(body.campos).toEqual(['nombre']);

    const despues = await prisma.proveedor.count({
      where: { negocioId: negocioA.id },
    });
    expect(despues).toBe(antes);
  });

  test('HU-09 escenario 3: un proveedor con compras se desactiva y conserva su historial', async () => {
    const proveedor = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Proveedor con compras' },
    });
    await prisma.compra.create({
      data: {
        negocioId: negocioA.id,
        proveedorId: proveedor.id,
        fecha: new Date(),
        total: 0,
      },
    });

    const { body } = await request(app)
      .delete(`${ruta}/${proveedor.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(body.proveedor).toMatchObject({
      id: proveedor.id,
      estado: 'INACTIVO',
    });

    const guardado = await prisma.proveedor.findUnique({
      where: { id: proveedor.id },
    });
    expect(guardado.estado).toBe('INACTIVO');

    const compras = await prisma.compra.count({
      where: { proveedorId: proveedor.id },
    });
    expect(compras).toBe(1);
  });

  test('HU-09 escenario 4: un proveedor inactivo no se ofrece al registrar una compra', async () => {
    const activo = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Proveedor activo' },
    });
    const inactivo = await prisma.proveedor.create({
      data: {
        negocioId: negocioA.id,
        nombre: 'Proveedor inactivo',
        estado: 'INACTIVO',
      },
    });

    const { body } = await request(app)
      .get(`${ruta}?estado=ACTIVO`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)
      .expect('Content-Type', /json/);

    const ids = body.proveedores.map((proveedor) => proveedor.id);
    expect(ids).toContain(activo.id);
    expect(ids).not.toContain(inactivo.id);
  });

  test('HU-09: un proveedor sin compras se elimina', async () => {
    const proveedor = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Proveedor sin compras' },
    });

    await request(app)
      .delete(`${ruta}/${proveedor.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const guardado = await prisma.proveedor.findUnique({
      where: { id: proveedor.id },
    });
    expect(guardado).toBeNull();
  });

  test('R-01: otro negocio no ve ni modifica mis proveedores', async () => {
    const proveedor = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Proveedor privado' },
    });

    await request(app)
      .delete(`${ruta}/${proveedor.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const intacto = await prisma.proveedor.findUnique({
      where: { id: proveedor.id },
    });
    expect(intacto).not.toBeNull();

    const { body } = await request(app)
      .get(ruta)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const ids = body.proveedores.map((item) => item.id);
    expect(ids).not.toContain(proveedor.id);
  });

  test('R-01: sin sesión se responde 401', async () => {
    await request(app).get(ruta).expect(401);
    await request(app).post(ruta).send({ nombre: 'Sin sesión' }).expect(401);
  });

test('HU-09: un estado inválido en el listado se rechaza con 400', async () => {
    const { body } = await request(app)
      .get(`${ruta}?estado=XYZ`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400)
      .expect('Content-Type', /json/);

    expect(body.mensaje).toEqual(expect.any(String));
    expect(body.campos).toEqual(['estado']);
  });

  test('R-01: eliminar sin sesión responde 401 y no modifica el proveedor', async () => {
    const proveedor = await prisma.proveedor.create({
      data: { negocioId: negocioA.id, nombre: 'Proveedor sin sesión' },
    });

    await request(app).delete(`${ruta}/${proveedor.id}`).expect(401);

    const intacto = await prisma.proveedor.findUnique({
      where: { id: proveedor.id },
    });
    expect(intacto).not.toBeNull();
    expect(intacto.estado).toBe('ACTIVO');
  });
});