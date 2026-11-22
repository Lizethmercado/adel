export async function registrarInsumo(token, datos) {
  const response = await fetch('/api/insumos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    const error = new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
    error.status = 401;
    throw error;
  }

  if (response.status === 409) {
    throw new Error(data?.mensaje || 'Ya existe un insumo con ese nombre.');
  }

  if (response.status === 400) {
    const error = new Error(data?.mensaje || 'Revisa los datos ingresados.');
    error.campos = data?.campos || [];
    throw error;
  }

  if (response.status !== 201) {
    throw new Error(data?.mensaje || 'No fue posible registrar el insumo.');
  }

  return data;
}
export async function listarInsumos(token, signal) {
  const respuesta = await fetch('/api/insumos', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (respuesta.status === 401) {
    return null;
  }

  if (!respuesta.ok) {
    throw new Error('No se pudo cargar el inventario.');
  }

  const datos = await respuesta.json();

  if (!Array.isArray(datos?.insumos)) {
    throw new Error('El servidor devolvió un inventario inválido.');
  }

  return datos.insumos;
}