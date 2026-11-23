const { randomUUID } = require('node:crypto');
const request = require('supertest');

const idPrueba = randomUUID();

const datos = {
  nombreCompleto: 'Usuario Integracion T42',
  nombreNegocio: `Negocio T42 ${idPrueba}`,
  correo: `integracion-${idPrueba}@example.com`,
  contrasena: 'ClaveT42Segura123',
};

let app;
let prisma;
let negocioId;

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
});

afterAll(async () => {
  if (!prisma) return;

  try {
    let idNegocioLimpieza = negocioId;

    // Recuperar el negocio por el correo si no se obtuvo su ID.
    if (!idNegocioLimpieza) {
      const usuario = await prisma.usuario.findUnique({
        where: { correo: datos.correo },
        select: { negocioId: true },
      });

      idNegocioLimpieza = usuario?.negocioId;
    }

    if (idNegocioLimpieza) {
      await prisma.$transaction([
        prisma.detalleCompra.deleteMany({
          where: { compra: { negocioId: idNegocioLimpieza } },
        }),
        prisma.compra.deleteMany({
          where: { negocioId: idNegocioLimpieza },
        }),
        prisma.insumo.deleteMany({
          where: { negocioId: idNegocioLimpieza },
        }),
        prisma.proveedor.deleteMany({
          where: { negocioId: idNegocioLimpieza },
        }),
        prisma.usuario.deleteMany({
          where: { negocioId: idNegocioLimpieza },
        }),
        prisma.negocio.deleteMany({
          where: { id: idNegocioLimpieza },
        }),
      ]);
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('Integración del recorrido principal de ADEL (T42)', () => {
  test('registra una cuenta, un insumo, un proveedor y una compra, y consulta su precio', async () => {
    // 1. Registrar usuario y negocio.
      const registro = await request(app)
    .post('/api/auth/register')
    .send(datos)
    .expect(201)
    .expect('Content-Type', /json/);

  // Capturar el ID antes de ejecutar las aserciones.
  negocioId = registro.body?.negocio?.id;

  expect(registro.body.usuario.correo).toBe(datos.correo);
  expect(registro.body.negocio.nombre).toBe(datos.nombreNegocio);

    // 2. Iniciar sesión y obtener el token.
    const login = await request(app)
      .post('/api/auth/login')
      .send({
        correo: datos.correo,
        contrasena: datos.contrasena,
      })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(login.body.token).toEqual(expect.any(String));

    const token = login.body.token;
    const autorizacion = { Authorization: `Bearer ${token}` };

    // 3. Registrar un insumo.
    const insumoRespuesta = await request(app)
      .post('/api/insumos')
      .set(autorizacion)
      .send({
        nombre: 'Harina de trigo',
        unidad: 'kg',
        cantidadActual: 10,
        cantidadMinima: 2,
      })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(insumoRespuesta.body).toMatchObject({
      nombre: 'Harina de trigo',
      unidad: 'kg',
    });

    const insumoId = insumoRespuesta.body.id;

    // 4. Registrar un proveedor.
    const proveedorRespuesta = await request(app)
      .post('/api/proveedores')
      .set(autorizacion)
      .send({
        nombre: 'Distribuidora T42',
        telefono: '3001234567',
      })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(proveedorRespuesta.body.proveedor).toMatchObject({
      nombre: 'Distribuidora T42',
      estado: 'ACTIVO',
    });

    const proveedorId = proveedorRespuesta.body.proveedor.id;

    // 5. Registrar una compra del insumo al proveedor.
    const precioUnitario = 4500;

    const compraRespuesta = await request(app)
      .post('/api/compras')
      .set(autorizacion)
      .send({
        proveedorId,
        fecha: '2026-11-22',
        detalles: [
          {
            insumoId,
            cantidad: 5,
            precioUnitario,
          },
        ],
      })
      .expect(201)
      .expect('Content-Type', /json/);

    expect(compraRespuesta.body.compra).toMatchObject({
      proveedorId,
      total: 22500,
    });

    // 6. Consultar la comparación y verificar el precio registrado.
    const comparacion = await request(app)
      .get(`/api/insumos/${insumoId}/comparacion`)
      .set(autorizacion)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(comparacion.body.insumo).toMatchObject({
      id: insumoId,
      nombre: 'Harina de trigo',
      unidad: 'kg',
    });

    expect(comparacion.body.proveedores).toHaveLength(1);
    expect(comparacion.body.proveedores[0]).toMatchObject({
      proveedorId,
      nombre: 'Distribuidora T42',
      ultimoPrecio: precioUnitario,
      fecha: '2026-11-22',
    });

    // Verificar que la compra quedó persistida.
    const compraGuardada = await prisma.compra.findUnique({
      where: { id: compraRespuesta.body.compra.id },
      include: { detalles: true },
    });

    expect(compraGuardada).not.toBeNull();
    expect(compraGuardada.detalles).toHaveLength(1);
    expect(Number(compraGuardada.detalles[0].precioUnitario)).toBe(precioUnitario);
  });
});
