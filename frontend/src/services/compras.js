export async function registrarCompra(token, datos) {
  const response = await fetch('/api/compras', {
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
    const error = new Error(
      data?.mensaje || 'Tu sesión ha expirado. Inicia sesión nuevamente.'
    );
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data?.mensaje || 'No fue posible registrar la compra.'
    );
    error.status = response.status;
    error.campos = data?.campos || [];
    throw error;
  }

  return data;
}
