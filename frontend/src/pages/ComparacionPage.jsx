import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { listarInsumos } from '../services/insumos.js';
import { compararPreciosInsumo } from '../services/precios.js';
import { clearSessionToken, readSessionToken } from '../services/session.js';
import './ComparacionPage.css';

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  }).format(valor || 0);
}

function formatoFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  const soloFecha = String(fecha).slice(0, 10);
  const [anio, mes, dia] = soloFecha.split('-');
  if (!anio || !mes || !dia) return soloFecha;
  return `${dia}/${mes}/${anio}`;
}

export default function ComparacionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = readSessionToken();
  const [insumos, setInsumos] = useState([]);
  const [insumoId, setInsumoId] = useState(() => searchParams.get('insumoId') || '');
  const [resultado, setResultado] = useState(null);
  const [cargandoInsumos, setCargandoInsumos] = useState(true);
  const [cargandoComparacion, setCargandoComparacion] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;

    async function cargarInsumos() {
      setCargandoInsumos(true);
      setError('');
      try {
        const lista = await listarInsumos(token);
        if (!vigente) return;
        if (lista === null) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
          return;
        }
        setInsumos(lista);
        if (lista.length > 0) {
          const idUrl = searchParams.get('insumoId');
          const existeIdUrl = lista.some((item) => String(item.id) === idUrl);
          setInsumoId(existeIdUrl ? idUrl : String(lista[0].id));
        }
      } catch (err) {
        if (!vigente) return;
        setError(err.message || 'No fue posible cargar los insumos.');
        if (err.status === 401) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
        }
      } finally {
        if (vigente) setCargandoInsumos(false);
      }
    }

    if (token) cargarInsumos();
    return () => {
      vigente = false;
    };
  }, [token, navigate, searchParams]);

  useEffect(() => {
    if (!token || !insumoId || insumos.length === 0) {
      setResultado(null);
      return;
    }

    const insumoSeleccionado = insumos.find((item) => String(item.id) === String(insumoId));
    if (!insumoSeleccionado) return;

    let vigente = true;
    setCargandoComparacion(true);
    setError('');

    async function consultarComparacion() {
      try {
        const data = await compararPreciosInsumo(token, insumoSeleccionado);
        if (!vigente) return;
        if (data === null) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
          return;
        }
        setResultado(data);
      } catch (err) {
        if (!vigente) return;
        setResultado(null);
        setError(err.message || 'No fue posible comparar los precios.');
        if (err.status === 401) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
        }
      } finally {
        if (vigente) setCargandoComparacion(false);
      }
    }

    consultarComparacion();
    return () => {
      vigente = false;
    };
  }, [token, insumoId, insumos, navigate]);

  if (!token) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  function cambiarInsumo(nuevoId) {
    setInsumoId(nuevoId);
    setSearchParams(nuevoId ? { insumoId: nuevoId } : {});
  }

  const proveedores = resultado?.proveedores || [];

  return (
    <section className="comparacion-page" aria-labelledby="comparacion-title">
      <header className="comparacion-header">
        <h1 id="comparacion-title">Comparar precios por proveedor</h1>
        <p>
          Consulta el último precio registrado de cada proveedor activo para un insumo, ordenado de menor a mayor.
        </p>
      </header>

      <section className="comparacion-card">
        {cargandoInsumos ? (
          <p className="comparacion-empty">Cargando insumos...</p>
        ) : insumos.length === 0 ? (
          <p className="comparacion-empty">
            Aún no hay insumos registrados. Registra un insumo y sus compras para comparar precios.
          </p>
        ) : (
          <>
            <div className="comparacion-selector">
              <label htmlFor="comparacion-insumo">Selecciona un insumo</label>
              <select
                id="comparacion-insumo"
                value={insumoId}
                onChange={(event) => cambiarInsumo(event.target.value)}
              >
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nombre} ({insumo.unidad})
                  </option>
                ))}
              </select>
            </div>

            {cargandoComparacion && (
              <p className="comparacion-empty" role="status">
                Consultando precios por proveedor...
              </p>
            )}

            {!cargandoComparacion && error && (
              <p className="comparacion-feedback error" role="alert">
                {error}
              </p>
            )}

            {!cargandoComparacion && !error && resultado?.mensaje && (
              <p className="comparacion-feedback info" role="status">
                {resultado.mensaje}
              </p>
            )}

            {!cargandoComparacion && !error && resultado && proveedores.length === 0 && !resultado.mensaje && (
              <p className="comparacion-empty">
                No hay compras registradas para este insumo todavía.
              </p>
            )}

            {!cargandoComparacion && !error && proveedores.length > 0 && (
              <div className="comparacion-table-wrapper">
                <table className="comparacion-table">
                  <thead>
                    <tr>
                      <th>Posición</th>
                      <th>Proveedor</th>
                      <th>Último precio</th>
                      <th>Fecha de compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveedores.map((proveedor, indice) => (
                      <tr
                        key={proveedor.proveedorId}
                        className={indice === 0 && proveedores.length > 1 ? 'comparacion-fila-mejor' : ''}
                      >
                        <td>#{indice + 1}</td>
                        <td>
                          {proveedor.nombre || proveedor.proveedor}
                          {indice === 0 && proveedores.length > 1 && (
                            <span className="comparacion-badge">Menor precio</span>
                          )}
                        </td>
                        <td>
                          <strong>{formatoMoneda(proveedor.ultimoPrecio)}</strong>
                        </td>
                        <td>{formatoFecha(proveedor.fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}
