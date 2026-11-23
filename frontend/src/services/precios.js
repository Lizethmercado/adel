// Cambiar a false cuando Lizeth fusione T40 (GET /api/insumos/:insumoId/comparacion)
const USAR_DATOS_EJEMPLO = true;

function compararPreciosMock(insumo) {
  const esImpar = Number(insumo.id) % 2 !== 0;

  if (esImpar) {
    return Promise.resolve({
      insumo: { id: insumo.id, nombre: insumo.nombre, unidad: insumo.unidad },
      proveedores: [
        {
          proveedorId: 101,
          nombre: 'Distribuidora El Trigo',
          ultimoPrecio: 4000,
          fecha: '2026-11-15',
        },
        {
          proveedorId: 102,
          nombre: 'Abastos La Cosecha',
          ultimoPrecio: 4400,
          fecha: '2026-11-18',
        },
      ],
    });
  }

  return Promise.resolve({
    insumo: { id: insumo.id, nombre: insumo.nombre, unidad: insumo.unidad },
    proveedores: [
      {
        proveedorId: 101,
        nombre: 'Distribuidora El Trigo',
        ultimoPrecio: 4200,
        fecha: '2026-11-16',
      },
    ],
    mensaje: 'No hay otro proveedor para comparar',
  });
}

export async function compararPreciosInsumo(token, insumo) {
  if (USAR_DATOS_EJEMPLO) {
    return compararPreciosMock(insumo);
  }

  const response = await fetch(`/api/insumos/${insumo.id}/comparacion`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.mensaje || 'No fue posible consultar la comparación de precios.');
  }

  return data;
}