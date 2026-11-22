const insumosService = require('../services/insumos.service');

const MAXIMO_CANTIDAD = 999999999;

function textoVacio(valor) {
    return typeof valor !== 'string' || valor.trim() === '';
}

// Acepta números y también texto numérico, que es lo que envía un formulario
function aNumero(valor) {
    if (typeof valor === 'number') {
        return valor;
    }
    if (typeof valor === 'string' && valor.trim() !== '') {
        return Number(valor);
    }
    return Number.NaN;
}

function cantidadInvalida(numero) {
    return !Number.isFinite(numero) || numero < 0 || numero > MAXIMO_CANTIDAD;
}

async function crear(req, res) {
    const datos = req.body || {};
    const campos = [];

    if (textoVacio(datos.nombre)) campos.push('nombre');
    if (textoVacio(datos.unidad)) campos.push('unidad');

    const cantidadActual = aNumero(datos.cantidadActual);
    const cantidadMinima = aNumero(datos.cantidadMinima);

    if (cantidadInvalida(cantidadActual)) campos.push('cantidadActual');
    if (cantidadInvalida(cantidadMinima)) campos.push('cantidadMinima');

    if (datos.perecedero !== undefined && typeof datos.perecedero !== 'boolean') {
        campos.push('perecedero');
    }

    if (campos.length > 0) {
        return res.status(400).json({
            mensaje: `Revisa los datos del insumo (${campos.join(', ')}): faltan o no son válidos.`,
            campos
        });
    }

    const insumo = await insumosService.crear(req.usuario.negocio.id, {
        nombre: datos.nombre.trim(),
        unidad: datos.unidad.trim(),
        cantidadActual,
        cantidadMinima,
        perecedero: datos.perecedero === true
    });

    return res.status(201).json({
        id: insumo.id,
        nombre: insumo.nombre,
        unidad: insumo.unidad,
        cantidadActual: Number(insumo.cantidadActual),
        cantidadMinima: Number(insumo.cantidadMinima),
        perecedero: insumo.perecedero
    });
}

module.exports = { crear };