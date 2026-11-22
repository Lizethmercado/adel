const prisma = require('../config/prisma');

const seleccion = { id: true, nombre: true, telefono: true, estado: true };

function errorConEstado(statusCode, mensaje) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
}

async function crear(negocioId, { nombre, telefono }) {
    return prisma.proveedor.create({
        data: { negocioId, nombre, telefono },
        select: seleccion
    });
}

async function listar(negocioId, estado) {
    return prisma.proveedor.findMany({
        where: { negocioId, ...(estado ? { estado } : {}) },
        orderBy: { nombre: 'asc' },
        select: seleccion
    });
}

function desactivar(id) {
    return prisma.proveedor.update({
        where: { id },
        data: { estado: 'INACTIVO' },
        select: seleccion
    });
}

// Con compras se desactiva (conserva el historial); sin compras se elimina
async function eliminarODesactivar(negocioId, id) {
    const proveedor = await prisma.proveedor.findFirst({
        where: { id, negocioId },
        select: { id: true }
    });

    if (!proveedor) {
        throw errorConEstado(404, 'Proveedor no encontrado.');
    }

    const compras = await prisma.compra.count({ where: { proveedorId: id } });

    if (compras > 0) {
        return { desactivado: true, proveedor: await desactivar(id) };
    }

    try {
        await prisma.proveedor.delete({ where: { id } });
        return { desactivado: false };
    } catch (error) {
        // Si justo se registró una compra, la llave foránea impide borrar: se desactiva
        if (error.code === 'P2003') {
            return { desactivado: true, proveedor: await desactivar(id) };
        }
        throw error;
    }
}

module.exports = { crear, listar, eliminarODesactivar };