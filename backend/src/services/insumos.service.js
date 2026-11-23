const prisma = require('../config/prisma');
const { normalizarNombre } = require('../utils/texto');

const MENSAJE_SIN_COMPARACION =
    'Se necesitan al menos dos compras al mismo proveedor para comparar';

function redondearDosDecimales(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}

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

async function obtenerVariacionPrecios(negocioId, insumoId) {
    const insumo = await prisma.insumo.findFirst({
        where: { id: insumoId, negocioId },
        select: {
            id: true,
            nombre: true,
            unidad: true
        }
    });

    if (!insumo) {
        return null;
    }

    const detalles = await prisma.detalleCompra.findMany({
        where: {
            insumoId: insumo.id,
            compra: { negocioId }
        },
        select: {
            id: true,
            cantidad: true,
            precioUnitario: true,
            compra: {
                select: {
                    id: true,
                    fecha: true,
                    creadoEn: true,
                    proveedor: {
                        select: {
                            id: true,
                            nombre: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { compra: { fecha: 'asc' } },
            { compra: { creadoEn: 'asc' } },
            { id: 'asc' }
        ]
    });

    const proveedoresMap = new Map();

    for (const detalle of detalles) {
        const { proveedor, id: compraId, fecha } = detalle.compra;

        if (!proveedoresMap.has(proveedor.id)) {
            proveedoresMap.set(proveedor.id, {
                proveedorId: proveedor.id,
                proveedor: proveedor.nombre,
                comprasMap: new Map()
            });
        }

        const grupo = proveedoresMap.get(proveedor.id);
        const cantidad = Number(detalle.cantidad);
        const precioUnitario = Number(detalle.precioUnitario);

        if (!grupo.comprasMap.has(compraId)) {
            grupo.comprasMap.set(compraId, {
                compraId,
                fecha: fecha.toISOString().slice(0, 10),
                cantidadTotal: 0,
                costoTotal: 0
            });
        }

        const registroCompra = grupo.comprasMap.get(compraId);
        registroCompra.cantidadTotal += cantidad;
        registroCompra.costoTotal += cantidad * precioUnitario;
    }

    const proveedores = Array.from(proveedoresMap.values()).map((grupo) => {
        const compras = [];

        for (const registro of grupo.comprasMap.values()) {
            const precioUnitario =
                registro.cantidadTotal > 0
                    ? redondearDosDecimales(registro.costoTotal / registro.cantidadTotal)
                    : 0;
            const compraAnterior = compras[compras.length - 1];

            let variacionPorcentual = null;
            if (compraAnterior && compraAnterior.precioUnitario > 0) {
                const variacion =
                    ((precioUnitario - compraAnterior.precioUnitario) /
                        compraAnterior.precioUnitario) *
                    100;
                variacionPorcentual = redondearDosDecimales(variacion);
            }

            compras.push({
                compraId: registro.compraId,
                fecha: registro.fecha,
                precioUnitario,
                variacionPorcentual
            });
        }

        return {
            proveedorId: grupo.proveedorId,
            proveedor: grupo.proveedor,
            compras
        };
    });

    const hayComparacionPosible = proveedores.some(
        (grupo) => grupo.compras.length >= 2
    );

    const resultado = {
        insumo,
        proveedores
    };

    if (!hayComparacionPosible) {
        resultado.mensaje = MENSAJE_SIN_COMPARACION;
    }

    return resultado;
}

async function obtenerComparacionPrecios(negocioId, insumoId) {
    const insumo = await prisma.insumo.findFirst({
        where: { id: insumoId, negocioId },
        select: {
            id: true,
            nombre: true,
            unidad: true
        }
    });

    if (!insumo) {
        return null;
    }

    const detalles = await prisma.detalleCompra.findMany({
        where: {
            insumoId: insumo.id,
            compra: {
                negocioId,
                proveedor: {
                    estado: 'ACTIVO'
                }
            }
        },
        select: {
            cantidad: true,
            precioUnitario: true,
            compra: {
                select: {
                    id: true,
                    fecha: true,
                    creadoEn: true,
                    proveedor: {
                        select: {
                            id: true,
                            nombre: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { compra: { fecha: 'desc' } },
            { compra: { creadoEn: 'desc' } },
            { compra: { id: 'desc' } },
            { id: 'asc' }
        ]
    });

    const proveedoresMap = new Map();

    for (const detalle of detalles) {
        const compra = detalle.compra;
        const proveedorId = compra.proveedor.id;

        if (!proveedoresMap.has(proveedorId)) {
            proveedoresMap.set(proveedorId, {
                proveedorId,
                nombre: compra.proveedor.nombre,
                compraId: compra.id,
                fecha: compra.fecha,
                cantidadTotal: 0,
                costoTotal: 0
            });
        }

        const registro = proveedoresMap.get(proveedorId);

        // Solo se considera la compra más reciente de cada proveedor.
        if (registro.compraId !== compra.id) {
            continue;
        }

        const cantidad = Number(detalle.cantidad);
        const precioUnitario = Number(detalle.precioUnitario);

        registro.cantidadTotal += cantidad;
        registro.costoTotal += cantidad * precioUnitario;
    }

    const proveedores = Array.from(proveedoresMap.values())
        .map((registro) => ({
            proveedorId: registro.proveedorId,
            nombre: registro.nombre,
            ultimoPrecio: registro.cantidadTotal > 0
                ? redondearDosDecimales(
                    registro.costoTotal / registro.cantidadTotal
                )
                : 0,
            fecha: registro.fecha.toISOString().slice(0, 10)
        }))
        .sort((a, b) => {
            if (a.ultimoPrecio !== b.ultimoPrecio) {
                return a.ultimoPrecio - b.ultimoPrecio;
            }

            return a.proveedorId - b.proveedorId;
        });

    const resultado = {
        insumo,
        proveedores
    };

    if (proveedores.length < 2) {
        resultado.mensaje = 'No hay otro proveedor para comparar';
    }

    return resultado;
}

module.exports = {
    crear,
    listarPorNegocio,
    obtenerVariacionPrecios,
    obtenerComparacionPrecios
};