import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { listarInsumos } from '../services/insumos.js';
import {
  clearSessionToken,
  readSessionToken,
} from '../services/session.js';
import './InventarioPage.css';

const formatoCantidad = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 3,
});

function estadoDelInsumo({ cantidadActual, cantidadMinima }) {
  if (cantidadActual < cantidadMinima) {
    return { texto: 'Por debajo del mínimo', clase: 'bajo' };
  }

  if (cantidadActual === cantidadMinima) {
    return { texto: 'En el mínimo', clase: 'minimo' };
  }

  return { texto: 'Disponible', clase: 'disponible' };
}

export default function InventarioPage() {
  const navigate = useNavigate();
  const token = readSessionToken();
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [consulta, setConsulta] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    async function cargarInventario() {
      try {
        const resultado = await listarInsumos(token, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        if (resultado === null) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
          return;
        }

        setInsumos(resultado);
      } catch {
        if (!controller.signal.aborted) {
          setError('No pudimos cargar el inventario. Vuelve a intentarlo.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarInventario();

    return () => controller.abort();
  }, [token, navigate, consulta]);

  function actualizar() {
    setCargando(true);
    setError('');
    setConsulta((valor) => valor + 1);
  }

  if (!token) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  return (
    <section className="inventario-page" aria-labelledby="inventario-title">
      <header className="inventario-header">
        <div>
          <h1 id="inventario-title">Inventario</h1>
          <p>Consulta las existencias de tu negocio y revisa qué insumos debes reponer.</p>
        </div>

        <button
          className="action"
          type="button"
          onClick={actualizar}
          disabled={cargando}
        >
          {cargando ? 'Cargando…' : 'Actualizar'}
        </button>
      </header>

      {cargando && (
        <p className="inventario-panel" role="status">
          Cargando inventario…
        </p>
      )}

      {!cargando && error && (
        <div className="inventario-panel">
          <p role="alert">{error}</p>
          <button className="action" type="button" onClick={actualizar}>
            Volver a intentar
          </button>
        </div>
      )}

      {!cargando && !error && insumos.length === 0 && (
        <div className="inventario-panel inventario-vacio">
          <h2>Aún no hay insumos</h2>
          <p>Los insumos que registres para tu negocio aparecerán aquí.</p>
        </div>
      )}

      {!cargando && !error && insumos.length > 0 && (
        <div
          className="inventario-tabla-contenedor"
          role="region"
          aria-label="Listado de insumos"
          tabIndex={0}
        >
          <table className="inventario-tabla">
            <thead>
              <tr>
                <th scope="col">Insumo</th>
                <th scope="col">Unidad</th>
                <th scope="col">Cantidad actual</th>
                <th scope="col">Cantidad mínima</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((insumo) => {
                const estado = estadoDelInsumo(insumo);

                return (
                  <tr key={insumo.id} className={`inventario-fila--${estado.clase}`}>
                    <th scope="row">{insumo.nombre}</th>
                    <td>{insumo.unidad}</td>
                    <td>{formatoCantidad.format(insumo.cantidadActual)}</td>
                    <td>{formatoCantidad.format(insumo.cantidadMinima)}</td>
                    <td>
                      <span className={`inventario-estado inventario-estado--${estado.clase}`}>
                        {estado.texto}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}