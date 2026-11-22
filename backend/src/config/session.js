const jwt = require('jsonwebtoken');
const config = require('./env');

const opciones = {
  issuer: 'adel',
  audience: 'adel-web',
};

function obtenerSecreto() {
  if (!config.jwtSecret?.trim()) {
    throw new Error('Configura JWT_SECRET para habilitar el inicio de sesión.');
  }

  return config.jwtSecret;
}

function crearToken(usuarioId) {
  return jwt.sign({}, obtenerSecreto(), {
    ...opciones,
    algorithm: 'HS256',
    subject: String(usuarioId),
    expiresIn: '1h',
  });
}

function verificarToken(token) {
  const secreto = obtenerSecreto();

  try {
    return jwt.verify(token, secreto, {
      ...opciones,
      algorithms: ['HS256'],
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return null;
    }

    throw error;
  }
}

module.exports = { crearToken, verificarToken };