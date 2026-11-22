// Quita espacios al inicio y al final, junta los espacios repetidos y pasa a minúsculas
function normalizarNombre(nombre) {
    return nombre.trim().replace(/\s+/g, ' ').toLowerCase();
}

module.exports = { normalizarNombre };