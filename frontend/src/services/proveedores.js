
const BASE_URL = '/api/proveedores';

async function solicitar(url, token, opciones = {}) {
  const response = await fetch(url, {
    ...opciones,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...opciones.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    const error = new Error(
      data?.mensaje || 'Tu sesión ha expirado. Inicia sesión nuevamente.'
    );
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data?.mensaje || 'No fue posible completar la operación.'
    );
    error.status = response.status;
    error.campos = data?.campos || [];
    throw error;
  }

  return data;
}

export async function listarProveedores(token, estado) {
  const parametros = estado ? `?estado=${encodeURIComponent(estado)}` : '';

  return solicitar(`${BASE_URL}${parametros}`, token);
}

export async function registrarProveedor(token, datos) {
  return solicitar(BASE_URL, token, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export async function eliminarProveedor(token, id) {
  return solicitar(`${BASE_URL}/${id}`, token, {
    method: 'DELETE',
  });
}
