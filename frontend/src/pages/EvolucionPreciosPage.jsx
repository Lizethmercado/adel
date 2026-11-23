import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { consultarVariacionPrecios, listarInsumos } from '../services/insumos.js';
import { clearSessionToken, readSessionToken } from '../services/session.js';
import './InventarioPage.css';
import './EvolucionPreciosPage.css';

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
});

const porcentaje = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

function HistorialProveedor({ proveedor }) {
  return (
    <section>
      <h2>{proveedor.proveedor}</h2>
      <div
        className="inventario-tabla-contenedor"
        role="region"
        aria-label={`Compras a ${proveedor.proveedor}`}
        tabIndex={0}
      >
        <table className="inventario-tabla">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Precio unitario</th>
              <th scope="col">Variación</th>
            </tr>
          </thead>
          <tbody>
            {proveedor.compras.map((compra) => (
              <tr key={compra.compraId}>
                <td>{compra.fecha}</td>
                <td>{pesos.format(compra.precioUnitario)}</td>
                <td>
                  {compra.variacionPorcentual == null
                    ? '—'
                    : `${porcentaje.format(compra.variacionPorcentual)} %`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function EvolucionPreciosPage() {
  const navigate = useNavigate();
  const token = readSessionToken();

  const [insumos, setInsumos] = useState(null);
  const [insumoId, setInsumoId] = useState('');
  const [historial, setHistorial] = useState(null);
  const [errorLista, setErrorLista] = useState('');
  const [errorHistorial, setErrorHistorial] = useState('');
  const [intentoLista, setIntentoLista] = useState(0);
  const [intentoHistorial, setIntentoHistorial] = useState(0);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function cargarInsumos() {
      try {
        const resultado = await listarInsumos(token, controller.signal);
        if (controller.signal.aborted) return;

        if (resultado === null) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
          return;
        }

        setInsumos(resultado);
      } catch {
        if (!controller.signal.aborted) {
          setErrorLista('No se pudo cargar la lista de insumos.');
        }
      }
    }

    cargarInsumos();
    return () => controller.abort();
  }, [token, navigate, intentoLista]);

  useEffect(() => {
    if (!token || !insumoId) return;

    const controller = new AbortController();

    async function cargarHistorial() {
      try {
        const resultado = await consultarVariacionPrecios(
          insumoId,
          token,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        if (resultado === null) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
          return;
        }

        setHistorial(resultado);
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorHistorial(error.message);
        }
      }
    }

    cargarHistorial();
    return () => controller.abort();
  }, [token, insumoId, navigate, intentoHistorial]);

  function cambiarInsumo(event) {
    setHistorial(null);
    setErrorHistorial('');
    setInsumoId(event.target.value);
  }

  function reintentarLista() {
    setErrorLista('');
    setIntentoLista((intento) => intento + 1);
  }

  function reintentarHistorial() {
    setErrorHistorial('');
    setIntentoHistorial((intento) => intento + 1);
  }

  if (!token) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  return (
    <section className="inventario-page" aria-labelledby="precios-titulo">
      <header className="inventario-header">
        <div>
          <h1 id="precios-titulo">Evolución de precios</h1>
          <p>Consulta cómo ha cambiado el precio de un insumo por proveedor.</p>
        </div>
      </header>

      <div className="inventario-panel precios-filtro">
        {errorLista ? (
          <>
            <p role="alert">{errorLista}</p>
            <button className="action" type="button" onClick={reintentarLista}>
              Volver a intentar
            </button>
          </>
        ) : insumos === null ? (
          <p role="status">Cargando insumos…</p>
        ) : insumos.length === 0 ? (
          <p>Aún no hay insumos para consultar.</p>
        ) : (
          <>
            <label htmlFor="precios-insumo">Insumo</label>
            <select id="precios-insumo" value={insumoId} onChange={cambiarInsumo}>
              <option value="">Selecciona un insumo</option>
              {insumos.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nombre} ({insumo.unidad})
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {insumoId && !historial && !errorHistorial && (
        <p className="inventario-panel" role="status">Cargando historial…</p>
      )}

      {errorHistorial && (
        <div className="inventario-panel">
          <p role="alert">{errorHistorial}</p>
          <button className="action" type="button" onClick={reintentarHistorial}>
            Volver a intentar
          </button>
        </div>
      )}

      {historial?.mensaje && (
        <p className="inventario-panel" role="status">{historial.mensaje}</p>
      )}

      {historial?.proveedores.map((proveedor) => (
        <HistorialProveedor key={proveedor.proveedorId} proveedor={proveedor} />
      ))}
    </section>
  );
}