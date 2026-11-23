
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
  const [insumoId, setInsumoId] = useState(
    () => searchParams.get('insumoId') || ''
  );
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
          const existeIdUrl = lista.some(
            (item) => String(item.id) === idUrl
          );

          setInsumoId(
            existeIdUrl ? idUrl : String(lista[0].id)
          );
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

    const insumoSeleccionado = insumos.find(
      (item) => String(item.id) === String(insumoId)
    );

    if (!insumoSeleccionado) return;

    let vigente = true;

    setCargandoComparacion(true);
    setError('');

    async function consultarComparacion() {
      try {
        const data = await compararPreciosInsumo(
          token,
          insumoSeleccionado
        );

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

  const insumoActual = insumos.find(
    (item) => String(item.id) === String(insumoId)
  );

  const mejorProveedor = proveedores[0];

  return (
    <section
      className="comparacion-page"
      aria-labelledby="comparacion-title"
    >
      <header className="comparacion-header">
        <div className="comparacion-header-text">
          <span className="comparacion-eyebrow">
            COMPRAS E INSUMOS
          </span>

          <h1 id="comparacion-title">
            Comparación de precios
          </h1>

          <p>
            Revisa los últimos precios registrados y compara las opciones
            disponibles entre tus proveedores.
          </p>
        </div>
      </header>

      <section className="comparacion-card">
        {cargandoInsumos ? (
          <p className="comparacion-empty">
            Cargando insumos...
          </p>
        ) : insumos.length === 0 ? (
          <p className="comparacion-empty">
            Aún no hay insumos registrados. Registra un insumo y sus compras
            para comparar precios.
          </p>
        ) : (
          <>
            <div className="comparacion-consulta">
              <div className="comparacion-selector">
                <label htmlFor="comparacion-insumo">
                  Insumo que deseas consultar
                </label>

                <select
                  id="comparacion-insumo"
                  value={insumoId}
                  onChange={(event) =>
                    cambiarInsumo(event.target.value)
                  }
                >
                  {insumos.map((insumo) => (
                    <option key={insumo.id} value={insumo.id}>
                      {insumo.nombre} ({insumo.unidad})
                    </option>
                  ))}
                </select>
              </div>

              {insumoActual && (
                <div className="comparacion-unidad">
                  <span>Unidad de medida</span>
                  <strong>{insumoActual.unidad}</strong>
                </div>
              )}
            </div>

            {cargandoComparacion && (
              <p className="comparacion-empty" role="status">
                Consultando precios por proveedor...
              </p>
            )}

            {!cargandoComparacion && error && (
              <p
                className="comparacion-feedback error"
                role="alert"
              >
                {error}
              </p>
            )}

            {!cargandoComparacion && !error && resultado?.mensaje && (
              <p
                className="comparacion-feedback info"
                role="status"
              >
                {resultado.mensaje}
              </p>
            )}

            {!cargandoComparacion &&
              !error &&
              resultado &&
              proveedores.length === 0 &&
              !resultado.mensaje && (
                <p className="comparacion-empty">
                  No hay compras registradas para este insumo todavía.
                </p>
              )}

            {!cargandoComparacion &&
              !error &&
              proveedores.length > 0 && (
                <div className="comparacion-resultados">
                  <div className="comparacion-resultados-heading">
                    <div>
                      <span className="comparacion-eyebrow">
                        RESULTADOS DE LA CONSULTA
                      </span>

                      <h2>Precios por proveedor</h2>
                    </div>

                    {proveedores.length > 1 && (
                      <span className="comparacion-orden">
                        Menor a mayor
                      </span>
                    )}
                  </div>

                  {proveedores.length === 1 ? (
                    <div className="comparacion-unico">
                      <article className="comparacion-proveedor-unico">
                        <div className="comparacion-unico-info">
                          <span className="comparacion-unico-label">
                            PROVEEDOR REGISTRADO
                          </span>

                          <h3>
                            {mejorProveedor.nombre ||
                              mejorProveedor.proveedor}
                          </h3>

                          <span className="comparacion-proveedor-fecha">
                            Última compra:{' '}
                            {formatoFecha(mejorProveedor.fecha)}
                          </span>
                        </div>

                        <div className="comparacion-proveedor-precio-unico">
                          <span>Último precio</span>

                          <strong>
                            {formatoMoneda(
                              mejorProveedor.ultimoPrecio
                            )}
                          </strong>
                        </div>
                      </article>

                      <p className="comparacion-sin-otros">
                        No hay otro proveedor para comparar. Cuando
                        registres compras con otros proveedores, podrás
                        consultar sus precios aquí.
                      </p>
                    </div>
                  ) : (
                    <>
                      <article className="comparacion-destacado">
                        <div className="comparacion-destacado-info">
                          <span className="comparacion-destacado-label">
                            PRECIO MÁS BAJO REGISTRADO
                          </span>

                          <h3>
                            {mejorProveedor.nombre ||
                              mejorProveedor.proveedor}
                          </h3>

                          <span className="comparacion-destacado-fecha">
                            Última compra:{' '}
                            {formatoFecha(mejorProveedor.fecha)}
                          </span>
                        </div>

                        <div className="comparacion-destacado-precio">
                          <span>Último precio</span>

                          <strong>
                            {formatoMoneda(
                              mejorProveedor.ultimoPrecio
                            )}
                          </strong>
                        </div>
                      </article>

                      <div className="comparacion-lista-heading">
                        <span>Posición y proveedor</span>
                        <span>Último precio</span>
                        <span>Fecha de compra</span>
                      </div>

                      <div className="comparacion-lista">
                        {proveedores.map((proveedor, indice) => (
                          <article
                            key={proveedor.proveedorId}
                            className={`comparacion-proveedor ${
                              indice === 0
                                ? 'comparacion-proveedor-mejor'
                                : ''
                            }`}
                          >
                            <div className="comparacion-proveedor-identidad">
                              <span className="comparacion-posicion">
                                {String(indice + 1).padStart(2, '0')}
                              </span>

                              <div className="comparacion-proveedor-nombre">
                                <strong>
                                  {proveedor.nombre ||
                                    proveedor.proveedor}
                                </strong>

                                {indice === 0 && (
                                  <span className="comparacion-badge">
                                    Menor precio
                                  </span>
                                )}
                              </div>
                            </div>

                            <strong className="comparacion-proveedor-precio">
                              {formatoMoneda(proveedor.ultimoPrecio)}
                            </strong>

                            <span className="comparacion-proveedor-fecha">
                              {formatoFecha(proveedor.fecha)}
                            </span>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
          </>
        )}
      </section>
    </section>
  );
}
