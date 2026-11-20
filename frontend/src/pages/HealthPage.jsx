import { useEffect, useState } from 'react'
import { checkHealth } from '../services/health.js'

const checkingMessage = 'Consultando el estado de la API…'

export default function HealthPage() {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState(checkingMessage)

  useEffect(() => {
    const controller = new AbortController()
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(5000),
    ])

    async function loadHealth() {
      try {
        await checkHealth(signal)

        if (!controller.signal.aborted) {
          setStatus('La API de ADEL está disponible.')
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus('No se pudo conectar con la API de ADEL.')
        }
      }
    }

    loadHealth()

    return () => controller.abort()
  }, [attempt])

  function retry() {
    setStatus(checkingMessage)
    setAttempt((previous) => previous + 1)
  }

  return (
    <section>
      <h1>Estado del sistema</h1>
      <p role="status">{status}</p>
      <button type="button" onClick={retry}>
        Volver a consultar
      </button>
    </section>
  )
}