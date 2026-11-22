const prisma = require('../config/prisma');
const { normalizarNombre } = require('../utils/texto');

async function crear(negocioId, datos) {
    try {
        return await prisma.insumo.create({
            data: {
                negocioId,
                nombre: datos.nombre,
                nombreNormalizado: normalizarNombre(datos.nombre),
                unidad: datos.unidad,
                cantidadActual: datos.cantidadActual,
                cantidadMinima: datos.cantidadMinima,
                perecedero: datos.perecedero
            }
        });
    } catch (error) {
        // La restricción cubre incluso dos solicitudes simultáneas.
        if (error.code === 'P2002') {
            const conflicto = new Error('Ya existe un insumo con ese nombre en tu negocio.');
            conflicto.statusCode = 409;
            throw conflicto;
        }

        throw error;
    }
}

function listarPorNegocio(negocioId) {
    return prisma.insumo.findMany({
        where: { negocioId },
        select: {
            id: true,
            nombre: true,
            unidad: true,
            cantidadActual: true,
            cantidadMinima: true
        },
        orderBy: { id: 'asc' }
    });
}

module.exports = { crear, listarPorNegocio };