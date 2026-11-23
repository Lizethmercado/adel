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
        const { proveedor } = detalle.compra;

        if (!proveedoresMap.has(proveedor.id)) {
            proveedoresMap.set(proveedor.id, {
                proveedorId: proveedor.id,
                proveedor: proveedor.nombre,
                compras: []
            });
        }

        const grupo = proveedoresMap.get(proveedor.id);
        const precioUnitario = Number(detalle.precioUnitario);
        const compraAnterior = grupo.compras[grupo.compras.length - 1];

        let variacionPorcentual = null;
        if (compraAnterior && compraAnterior.precioUnitario > 0) {
            const variacion =
                ((precioUnitario - compraAnterior.precioUnitario) /
                    compraAnterior.precioUnitario) *
                100;
            variacionPorcentual = redondearDosDecimales(variacion);
        }

        grupo.compras.push({
            compraId: detalle.compra.id,
            fecha: detalle.compra.fecha.toISOString().slice(0, 10),
            precioUnitario,
            variacionPorcentual
        });
    }

    const proveedores = Array.from(proveedoresMap.values());
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

module.exports = { crear, listarPorNegocio, obtenerVariacionPrecios };