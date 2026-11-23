const proveedoresService = require('../services/proveedores.service');

const ESTADOS = ['ACTIVO', 'INACTIVO'];

function textoVacio(valor) {
    return typeof valor !== 'string' || valor.trim() === '';
}

async function crear(req, res) {
    const datos = req.body || {};
    const campos = [];

    if (textoVacio(datos.nombre)) {
        campos.push('nombre');
    }

    if (datos.telefono !== undefined && datos.telefono !== null && typeof datos.telefono !== 'string') {
        campos.push('telefono');
    }

    if (campos.length > 0) {
        return res.status(400).json({
            mensaje: 'Revisa los datos del proveedor: el nombre es obligatorio.',
            campos
        });
    }

    const telefono = typeof datos.telefono === 'string' ? datos.telefono.trim() : '';

    const proveedor = await proveedoresService.crear(req.usuario.negocio.id, {
        nombre: datos.nombre.trim(),
        telefono: telefono === '' ? null : telefono
    });

    return res.status(201).json({ mensaje: 'Proveedor registrado.', proveedor });
}

async function listar(req, res) {
    const { estado } = req.query;
    let filtro;

    if (estado !== undefined) {
        filtro = typeof estado === 'string' ? estado.toUpperCase() : '';

        if (!ESTADOS.includes(filtro)) {
            return res.status(400).json({
                mensaje: 'El estado debe ser ACTIVO o INACTIVO.',
                campos: ['estado']
            });
        }
    }

    const proveedores = await proveedoresService.listar(req.usuario.negocio.id, filtro);

    return res.status(200).json({ proveedores });
}

async function eliminar(req, res) {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(404).json({ mensaje: 'Proveedor no encontrado.' });
    }

    const resultado = await proveedoresService.eliminarODesactivar(req.usuario.negocio.id, id);

    if (resultado.desactivado) {
        return res.status(200).json({
            mensaje: 'El proveedor tiene compras registradas: se desactivó y se conservó su historial.',
            proveedor: resultado.proveedor
        });
    }

    return res.status(200).json({ mensaje: 'Proveedor eliminado.' });
}

module.exports = { crear, listar, eliminar };