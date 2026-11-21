const bcrypt = require('bcryptjs');

const prisma = require('../config/prisma');

const RONDAS_HASH = 10;

function errorConEstado(statusCode, mensaje) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

// El correo se guarda sin espacios sobrantes y en minúsculas
function normalizarCorreo(correo) {
    return correo.trim().toLowerCase();
}

async function registrar({ nombreCompleto, nombreNegocio, correo, contrasena }) {
    const correoNormalizado = normalizarCorreo(correo);

    const existente = await prisma.usuario.findUnique({
        where: { correo: correoNormalizado }
    });

    if (existente) {
        throw errorConEstado(409, 'El correo ya está registrado.');
    }

    const contrasenaHash = await bcrypt.hash(contrasena, RONDAS_HASH);

    try {
        // Usuario y negocio se crean juntos: si falla uno, no se guarda ninguno
        return await prisma.$transaction(async (tx) => {
            const negocio = await tx.negocio.create({
                data: { nombre: nombreNegocio.trim() }
            });

            const usuario = await tx.usuario.create({
                data: {
                    negocioId: negocio.id,
                    nombreCompleto: nombreCompleto.trim(),
                    correo: correoNormalizado,
                    contrasenaHash
                }
            });

            return { negocio, usuario };
        });
    } catch (error) {
        // Dos registros simultáneos con el mismo correo: lo detecta la restricción única
        if (error.code === 'P2002') {
            throw errorConEstado(409, 'El correo ya está registrado.');
        }
        throw error;
    }
}

module.exports = { registrar, normalizarCorreo };