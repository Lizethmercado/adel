const { randomUUID } = require('node:crypto');
const request = require('supertest');

const rutaRegistro = '/api/auth/register';

let app;
let prisma;
let baseVerificada = false;
let datos;
let nombreNegocioOriginal;

beforeAll(async () => {
  const url = process.env.DATABASE_URL;

  if (!url || new URL(url).pathname !== '/adel_test') {
    throw new Error('Configura DATABASE_URL para usar adel_test.');
  }

  prisma = require('../src/config/prisma');
  const [resultado] = await prisma.$queryRaw`
    SELECT current_database() AS nombre
  `;

  if (resultado.nombre !== 'adel_test') {
    throw new Error('La conexión de pruebas debe usar adel_test.');
  }

  baseVerificada = true;
  app = require('../src/app');
});

beforeEach(() => {
  const id = randomUUID();

  datos = {
    nombreCompleto: 'Ana Pérez',
    nombreNegocio: `Negocio T17 ${id}`,
    correo: `ana-${id}@example.com`,
    contrasena: 'ClaveT17Segura',
  };

  nombreNegocioOriginal = `Negocio original T17 ${id}`;
});

afterEach(async () => {
  if (!baseVerificada || !datos) {
    return;
  }

  // Cada caso limpia sus propios registros, respetando la clave foránea.
  await prisma.$transaction([
    prisma.usuario.deleteMany({
      where: { correo: { equals: datos.correo, mode: 'insensitive' } },
    }),
    prisma.negocio.deleteMany({
      where: { nombre: { in: [datos.nombreNegocio, nombreNegocioOriginal] } },
    }),
  ]);

  datos = undefined;
});

afterAll(async () => {
  await prisma?.$disconnect();
});

describe('POST /api/auth/register (HU-01)', () => {
  test('HU-01 escenario 1: responde 201 y guarda el usuario vinculado a su negocio', async () => {
    const respuesta = await request(app)
      .post(rutaRegistro)
      .send({ ...datos, correo: ` ${datos.correo.toUpperCase()} ` })
      .expect(201)
      .expect('Content-Type', /json/);

    const { mensaje, usuario, negocio } = respuesta.body;

    expect(mensaje).toEqual(expect.any(String));
    expect(usuario).toEqual({
      id: expect.any(Number),
      nombreCompleto: datos.nombreCompleto,
      correo: datos.correo,
    });
    expect(negocio).toEqual({
      id: expect.any(Number),
      nombre: datos.nombreNegocio,
    });
    expect(respuesta.body).not.toHaveProperty('contrasenaHash');

    const usuarioGuardado = await prisma.usuario.findUnique({
      where: { correo: datos.correo },
      include: { negocio: true },
    });

    expect(usuarioGuardado).toMatchObject({
      id: usuario.id,
      negocioId: negocio.id,
      nombreCompleto: datos.nombreCompleto,
      correo: datos.correo,
      negocio: { id: negocio.id, nombre: datos.nombreNegocio },
    });
  });

  test('HU-01 escenario 2: responde 400 e indica el campo obligatorio faltante', async () => {
    const respuesta = await request(app)
      .post(rutaRegistro)
      .send({
        nombreCompleto: datos.nombreCompleto,
        correo: datos.correo,
        contrasena: datos.contrasena,
      })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(respuesta.body.mensaje).toEqual(expect.any(String));
    expect(respuesta.body.campos).toEqual(
      expect.arrayContaining(['nombreNegocio']),
    );
  });

  test('HU-01 escenario 3: responde 400 cuando la contraseña tiene menos de ocho caracteres', async () => {
    const respuesta = await request(app)
      .post(rutaRegistro)
      .send({ ...datos, contrasena: 'Abc1234' })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(respuesta.body.mensaje).toEqual(expect.any(String));
    expect(respuesta.body.mensaje).toMatch(/\b(?:8|ocho)\b/i);
  });

  test('HU-01 escenario 4: responde 409 por correo duplicado y no crea otro usuario ni negocio', async () => {
    const original = await prisma.negocio.create({
      data: {
        nombre: nombreNegocioOriginal,
        usuario: {
          create: {
            nombreCompleto: 'Usuario existente',
            correo: datos.correo,
            contrasenaHash: 'hash-de-prueba',
          },
        },
      },
      include: { usuario: true },
    });

    const respuesta = await request(app)
      .post(rutaRegistro)
      .send({ ...datos, correo: ` ${datos.correo.toUpperCase()} ` })
      .expect(409)
      .expect('Content-Type', /json/);

    expect(respuesta.body.mensaje).toEqual(expect.any(String));

    const usuarios = await prisma.usuario.findMany({
      where: { correo: { equals: datos.correo, mode: 'insensitive' } },
      select: { id: true, negocioId: true },
    });

    expect(usuarios).toEqual([
      { id: original.usuario.id, negocioId: original.id },
    ]);

    const negociosNuevos = await prisma.negocio.count({
      where: { nombre: datos.nombreNegocio },
    });

    expect(negociosNuevos).toBe(0);
  });
});