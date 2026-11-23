const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const rutaLogin = '/api/auth/login';
const idPrueba = randomUUID();
const correo = `login-${idPrueba}@example.com`;
const contrasena = 'ClaveT21Segura123';

let app;
let prisma;
let negocio;

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

  app = require('../src/app');

  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  negocio = await prisma.negocio.create({
    data: {
      nombre: `Negocio T21 ${idPrueba}`,
      usuario: {
        create: {
          nombreCompleto: 'Ana Pérez',
          correo,
          contrasenaHash,
        },
      },
    },
  });
});

afterAll(async () => {
  if (!prisma) {
    return;
  }

  try {
    if (negocio) {
      await prisma.$transaction([
        prisma.usuario.deleteMany({
          where: { negocioId: negocio.id },
        }),
        prisma.negocio.delete({
          where: { id: negocio.id },
        }),
      ]);
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('POST /api/auth/login (HU-02)', () => {
  test('HU-02 escenario 1: responde 200 y devuelve el token y el negocio de la cuenta', async () => {
    const { body } = await request(app)
      .post(rutaLogin)
      .send({ correo, contrasena })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(body.token).toEqual(expect.any(String));
    expect(body.token.trim()).not.toBe('');
    expect(body.negocio).toMatchObject({
      id: negocio.id,
      nombre: negocio.nombre,
    });
  });

  test('HU-02 escenario 2: responde 401 con un mensaje general para credenciales incorrectas', async () => {
    const claveIncorrecta = await request(app)
      .post(rutaLogin)
      .send({ correo, contrasena: 'ClaveIncorrecta123' })
      .expect(401)
      .expect('Content-Type', /json/);

    const correoInexistente = await request(app)
      .post(rutaLogin)
      .send({
        correo: `sin-cuenta-${idPrueba}@example.com`,
        contrasena,
      })
      .expect(401)
      .expect('Content-Type', /json/);

    expect(claveIncorrecta.body).toEqual({
      mensaje: 'Credenciales incorrectas',
    });
    expect(correoInexistente.body).toEqual(claveIncorrecta.body);
  });

  test('HU-02 escenario 3: responde 400 cuando faltan datos obligatorios', async () => {
    const sinContrasena = await request(app)
      .post(rutaLogin)
      .send({ correo })
      .expect(400)
      .expect('Content-Type', /json/);

    const sinCorreo = await request(app)
      .post(rutaLogin)
      .send({ contrasena })
      .expect(400)
      .expect('Content-Type', /json/);

    expect(sinContrasena.body.mensaje).toEqual(expect.any(String));
    expect(sinCorreo.body.mensaje).toEqual(expect.any(String));
    expect(sinContrasena.body).not.toHaveProperty('token');
    expect(sinCorreo.body).not.toHaveProperty('token');
  });
});