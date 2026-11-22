import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  clearSessionToken,
  getCurrentSession,
  readSessionToken,
} from '../services/session.js';

export default function BusinessPage() {
  const navigate = useNavigate();
  const token = readSessionToken();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function verifySession() {
      try {
        const data = await getCurrentSession(token, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        if (!data) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
          return;
        }

        setSession(data);
      } catch {
        if (!controller.signal.aborted) {
          setError('No se pudo verificar tu sesión. Inténtalo nuevamente.');
        }
      }
    }

    verifySession();

    return () => controller.abort();
  }, [token, navigate, attempt]);

  function signOut() {
    clearSessionToken();
    navigate('/iniciar-sesion', { replace: true });
  }

  function retry() {
    setError('');
    setAttempt((value) => value + 1);
  }

  if (!token) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  return (
    <section className="surface" aria-labelledby="business-title">
      <h1 id="business-title">{session?.negocio.nombre ?? 'Mi negocio'}</h1>

      {session ? (
        <p>Sesión iniciada como <strong>{session.usuario.nombreCompleto}</strong>.</p>
      ) : (
        <p role="status">{error || 'Verificando sesión…'}</p>
      )}

      {error && (
        <button className="action" type="button" onClick={retry}>
          Volver a intentar
        </button>
      )}{' '}

      <button className="action" type="button" onClick={signOut}>
        Cerrar sesión
      </button>
    </section>
  );
}