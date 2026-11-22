const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { crearToken } = require('../config/session');
const requireSession = require('../middlewares/require-session.middleware');

const router = express.Router();
const hashDeReferencia = bcrypt.hashSync('referencia-login-adel', 10);

router.post('/auth/login', async (req, res, next) => {
  const { correo, contrasena } = req.body ?? {};
  const correoNormalizado =
    typeof correo === 'string' ? correo.trim().toLowerCase() : '';

  if (!correoNormalizado || typeof contrasena !== 'string' || !contrasena) {
    return res.status(400).json({
      mensaje: 'El correo y la contraseña son obligatorios',
    });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correoNormalizado },
      select: {
        id: true,
        contrasenaHash: true,
        negocio: {
          select: { id: true, nombre: true },
        },
      },
    });

    const coincide = await bcrypt.compare(
      contrasena,
      usuario?.contrasenaHash ?? hashDeReferencia,
    );

    if (!usuario || !coincide) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    return res.status(200).json({
      token: crearToken(usuario.id),
      negocio: usuario.negocio,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/auth/me', requireSession, (req, res) => {
  const { negocio, ...usuario } = req.usuario;
  return res.json({ usuario, negocio });
});

module.exports = router;