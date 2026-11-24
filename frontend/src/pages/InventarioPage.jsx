
import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router';
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

  const totalInsumos = insumos.length;

  const insumosDisponibles = insumos.filter(
    (insumo) => estadoDelInsumo(insumo).clase === 'disponible'
  ).length;

  const insumosPorReponer = insumos.filter(
    (insumo) => estadoDelInsumo(insumo).clase !== 'disponible'
  ).length;

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
        <div className="inventario-header__contenido">
          <span className="inventario-eyebrow">GESTIÓN DE INSUMOS</span>
          <h1 id="inventario-title">Inventario</h1>
          <p>
            Consulta las existencias de tu negocio y revisa qué insumos debes reponer.
          </p>
        </div>

        <button
          className="action inventario-actualizar"
          type="button"
          onClick={actualizar}
          disabled={cargando}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      {!cargando && !error && insumos.length > 0 && (
        <section className="inventario-resumen" aria-label="Resumen del inventario">
          <article className="inventario-indicador">
            <div className="inventario-indicador__icono inventario-indicador__icono--total">
              <img src="/imagenes/inventario.svg" alt="" aria-hidden="true" />
            </div>
            <div>
              <span>Total de insumos</span>
              <strong>{totalInsumos}</strong>
            </div>
          </article>

          <article className="inventario-indicador">
            <div className="inventario-indicador__icono inventario-indicador__icono--disponible">
              <img src="/imagenes/disponibles.svg" alt="" aria-hidden="true" />
            </div>
            <div>
              <span>Disponibles</span>
              <strong>{insumosDisponibles}</strong>
            </div>
          </article>

          <article className="inventario-indicador">
            <div className="inventario-indicador__icono inventario-indicador__icono--reponer">
              <AlertTriangle size={21} aria-hidden="true" />
            </div>
            <div>
              <span>Por reponer</span>
              <strong>{insumosPorReponer}</strong>
            </div>
          </article>
        </section>
      )}

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
                <th scope="col">Acciones</th>
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
                    <td>
                      <Link
                        className="inventario-comparar-link"
                        to={`/comparacion?insumoId=${insumo.id}`}
                      >
                        Comparar
                      </Link>
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
