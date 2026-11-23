const { Prisma } = require('@prisma/client');
const { registrar, CompraInvalidaError } = require('../services/compras.service');

function idValido(valor) {
    return Number.isInteger(valor) && valor > 0 && valor <= 2147483647;
}

function leerFecha(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return null;
    }

    const fecha = new Date(`${valor}T00:00:00.000Z`);

    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
        return null;
    }

    return fecha;
}

function leerDecimalPositivo(valor, maximo, escala) {
    if (typeof valor !== 'number' && typeof valor !== 'string') {
        return null;
    }

    const texto = String(valor).trim();

    if (!/^\d+(?:\.\d+)?$/.test(texto)) {
        return null;
    }

    const numero = new Prisma.Decimal(texto);

    if (!numero.gt(0) || numero.gt(maximo) || numero.decimalPlaces() > escala) {
        return null;
    }

    return numero;
}

async function crear(req, res) {
    const { proveedorId, fecha, detalles } = req.body ?? {};
    const campos = [];
    const fechaCompra = leerFecha(
        fecha === undefined ? new Date().toISOString().slice(0, 10) : fecha
    );
    const detallesValidados = [];

    if (!idValido(proveedorId)) campos.push('proveedorId');
    if (!fechaCompra) campos.push('fecha');

    if (!Array.isArray(detalles) || detalles.length === 0) {
        campos.push('detalles');
    } else {
        for (const detalle of detalles) {
            const insumoId = detalle?.insumoId;
            const cantidad = leerDecimalPositivo(detalle?.cantidad, '999999999.999', 3);
            const precioUnitario = leerDecimalPositivo(
                detalle?.precioUnitario,
                '999999999999.99',
                2
            );

            if (!idValido(insumoId) || !cantidad || !precioUnitario) {
                campos.push('detalles');
                break;
            }

            detallesValidados.push({ insumoId, cantidad, precioUnitario });
        }
    }

    if (campos.length > 0) {
        return res.status(400).json({
            mensaje: 'Revisa los datos de la compra.',
            campos
        });
    }

    try {
        const compra = await registrar(req.usuario.negocio.id, {
            proveedorId,
            fecha: fechaCompra,
            detalles: detallesValidados
        });

        return res.status(201).json({
            mensaje: 'Compra registrada correctamente.',
            compra: {
                id: compra.id,
                proveedorId: compra.proveedorId,
                fecha: compra.fecha.toISOString().slice(0, 10),
                total: Number(compra.total),
                detalles: compra.detalles.map((detalle) => ({
                    id: detalle.id,
                    insumoId: detalle.insumoId,
                    cantidad: Number(detalle.cantidad),
                    precioUnitario: Number(detalle.precioUnitario)
                }))
            }
        });
    } catch (error) {
        if (error instanceof CompraInvalidaError) {
            return res.status(400).json({
                mensaje: error.message,
                campos: error.campos
            });
        }

        throw error;
    }
}

module.exports = { crear };