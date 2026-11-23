const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');

const MAXIMO_TOTAL = new Prisma.Decimal('999999999999.99');
const MAXIMO_STOCK = new Prisma.Decimal('999999999.999');
const MAXIMO_INTENTOS = 3;

class CompraInvalidaError extends Error {
    constructor(mensaje, campos) {
        super(mensaje);
        this.campos = campos;
    }
}

async function registrarEnTransaccion(tx, negocioId, { proveedorId, fecha, detalles }) {
    const proveedor = await tx.proveedor.findFirst({
        where: { id: proveedorId, negocioId, estado: 'ACTIVO' },
        select: { id: true }
    });

    if (!proveedor) {
        throw new CompraInvalidaError(
            'Selecciona un proveedor activo de tu negocio.',
            ['proveedorId']
        );
    }

    const cantidadesPorInsumo = new Map();
    let total = new Prisma.Decimal(0);

    for (const { insumoId, cantidad, precioUnitario } of detalles) {
        total = total.plus(cantidad.times(precioUnitario));
        const cantidadAnterior = cantidadesPorInsumo.get(insumoId);

        cantidadesPorInsumo.set(
            insumoId,
            cantidadAnterior ? cantidadAnterior.plus(cantidad) : cantidad
        );
    }

    total = total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    if (total.gt(MAXIMO_TOTAL)) {
        throw new CompraInvalidaError(
            'El total supera el máximo permitido.',
            ['detalles']
        );
    }

    const insumos = await tx.insumo.findMany({
        where: {
            negocioId,
            id: { in: [...cantidadesPorInsumo.keys()] }
        },
        select: { id: true, cantidadActual: true },
        orderBy: { id: 'asc' }
    });

    if (insumos.length !== cantidadesPorInsumo.size) {
        throw new CompraInvalidaError(
            'Todos los insumos deben pertenecer a tu negocio.',
            ['detalles']
        );
    }

    for (const insumo of insumos) {
        const cantidad = cantidadesPorInsumo.get(insumo.id);

        if (insumo.cantidadActual.plus(cantidad).gt(MAXIMO_STOCK)) {
            throw new CompraInvalidaError(
                'La compra supera el máximo de existencias permitido.',
                ['detalles']
            );
        }
    }

    const compra = await tx.compra.create({
        data: {
            negocioId,
            proveedorId,
            fecha,
            total,
            detalles: { create: detalles }
        },
        include: { detalles: { orderBy: { id: 'asc' } } }
    });

    for (const insumo of insumos) {
        const actualizacion = await tx.insumo.updateMany({
            where: { id: insumo.id, negocioId },
            data: {
                cantidadActual: {
                    increment: cantidadesPorInsumo.get(insumo.id)
                }
            }
        });

        if (actualizacion.count !== 1) {
            throw new CompraInvalidaError(
                'Uno de los insumos ya no está disponible.',
                ['detalles']
            );
        }
    }

    return compra;
}

async function registrar(negocioId, datos) {
    for (let intento = 1; intento <= MAXIMO_INTENTOS; intento += 1) {
        try {
            return await prisma.$transaction(
                (tx) => registrarEnTransaccion(tx, negocioId, datos),
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            );
        } catch (error) {
            if (error.code !== 'P2034') {
                throw error;
            }

            if (intento === MAXIMO_INTENTOS) {
                const conflicto = new Error(
                    'El inventario cambió durante el registro. Inténtalo nuevamente.'
                );
                conflicto.statusCode = 409;
                throw conflicto;
            }
        }
    }
}

module.exports = { registrar, CompraInvalidaError };