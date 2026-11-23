export async function compararPreciosInsumo(token, insumo) {
  const insumoId = typeof insumo === 'object' && insumo !== null ? insumo.id : insumo;

  const response = await fetch(`/api/insumos/${insumoId}/comparacion`, {
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