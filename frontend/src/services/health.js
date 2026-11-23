export async function checkHealth(signal) {
  const response = await fetch('/api/health', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    throw new Error(`La API respondió con HTTP ${response.status}.`)
  }

  const payload = await response.json()

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('La respuesta de la API no contiene un objeto JSON.')
  }
}