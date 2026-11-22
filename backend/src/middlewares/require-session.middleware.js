const prisma = require('../config/prisma');
const { verificarToken } = require('../config/session');

async function requireSession(req, res, next) {
  const coincidencia = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '');

  if (!coincidencia) {
    return res.status(401).json({ mensaje: 'Debes iniciar sesión' });
  }

  try {
    const sesion = verificarToken(coincidencia[1]);
    const usuarioId = Number(sesion?.sub);

    if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) {
      return res.status(401).json({ mensaje: 'Sesión inválida o expirada' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombreCompleto: true,
        correo: true,
        negocio: {
          select: { id: true, nombre: true },
        },
      },
    });

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Sesión inválida o expirada' });
    }

    req.usuario = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireSession;