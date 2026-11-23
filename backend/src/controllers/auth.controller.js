const authService = require('../services/auth.service');

const CAMPOS_OBLIGATORIOS = ['nombreCompleto', 'nombreNegocio', 'correo', 'contrasena'];
const LONGITUD_MINIMA_CONTRASENA = 8;

function estaVacio(valor) {
    return typeof valor !== 'string' || valor.trim() === '';
}

async function register(req, res) {
    const datos = req.body || {};

    const faltantes = CAMPOS_OBLIGATORIOS.filter((campo) => estaVacio(datos[campo]));

    if (faltantes.length > 0) {
        return res.status(400).json({
            mensaje: 'Faltan datos obligatorios.',
            campos: faltantes
        });
    }

    if (datos.contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
        return res.status(400).json({
            mensaje: `La contraseña debe tener mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres.`
        });
    }

    const { usuario, negocio } = await authService.registrar(datos);

    return res.status(201).json({
        mensaje: 'Registro exitoso.',
        usuario: {
            id: usuario.id,
            nombreCompleto: usuario.nombreCompleto,
            correo: usuario.correo
        },
        negocio: {
            id: negocio.id,
            nombre: negocio.nombre
        }
    });
}

module.exports = { register };