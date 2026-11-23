import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { clearSessionToken, readSessionToken } from '../services/session.js';
import { registrarCompra } from '../services/compras.js';
import { listarProveedores } from '../services/proveedores.js';
import { listarInsumos } from '../services/insumos.js';
import './ComprasPage.css';

function fechaLocalActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

function nuevaLinea() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    insumoId: '',
    cantidad: '1',
    precioUnitario: '',
  };
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 2,
  }).format(valor || 0);
}

export default function ComprasPage() {
  const navigate = useNavigate();
  const token = readSessionToken();

  const [proveedores, setProveedores] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [fecha, setFecha] = useState(fechaLocalActual);
  const [detalles, setDetalles] = useState(() => [nuevaLinea()]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;

    async function cargarDatos() {
      setCargando(true);
      setError('');

      try {
        const [datosProveedores, datosInsumos] = await Promise.all([
          listarProveedores(token, 'ACTIVO'),
          listarInsumos(token),
        ]);

        if (!vigente) return;

        if (datosInsumos === null) {
          const err = new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
          err.status = 401;
          throw err;
        }

        setProveedores(datosProveedores.proveedores || []);
        setInsumos(datosInsumos);
      } catch (err) {
        if (!vigente) return;

        setError(err.message || 'No fue posible cargar los datos.');

        if (err.status === 401) {
          clearSessionToken();
          navigate('/iniciar-sesion', { replace: true });
        }
      } finally {
        if (vigente) setCargando(false);
      }
    }

    if (token) cargarDatos();

    return () => {
      vigente = false;
    };
  }, [token, navigate]);

  const total = useMemo(
    () => detalles.reduce((suma, detalle) => {
      const subtotal = Number(detalle.cantidad) * Number(detalle.precioUnitario);
      return suma + (Number.isFinite(subtotal) ? subtotal : 0);
    }, 0),
    [detalles]
  );

  if (!token) return <Navigate to="/iniciar-sesion" replace />;

  function actualizarDetalle(id, campo, valor) {
    setDetalles((actuales) => actuales.map((detalle) =>
      detalle.id === id ? { ...detalle, [campo]: valor } : detalle
    ));
  }

  function agregarDetalle() {
    setDetalles((actuales) => [...actuales, nuevaLinea()]);
  }

  function quitarDetalle(id) {
    setDetalles((actuales) => actuales.length > 1
      ? actuales.filter((detalle) => detalle.id !== id)
      : actuales
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMensaje('');

    if (!proveedorId) {
      setError('Selecciona un proveedor para la compra.');
      return;
    }

    if (!fecha) {
      setError('Selecciona la fecha de la compra.');
      return;
    }

    const invalido = detalles.some((detalle) =>
      !detalle.insumoId ||
      !Number.isFinite(Number(detalle.cantidad)) ||
      Number(detalle.cantidad) <= 0 ||
      !Number.isFinite(Number(detalle.precioUnitario)) ||
      Number(detalle.precioUnitario) <= 0
    );

    if (invalido) {
      setError('Completa cada insumo con una cantidad y un precio unitario mayores que cero.');
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await registrarCompra(token, {
        proveedorId: Number(proveedorId),
        fecha,
        detalles: detalles.map((detalle) => ({
          insumoId: Number(detalle.insumoId),
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
        })),
      });

      setMensaje(`${respuesta.mensaje} Total: ${formatoMoneda(respuesta.compra.total)}.`);
      setProveedorId('');
      setFecha(fechaLocalActual());
      setDetalles([nuevaLinea()]);
    } catch (err) {
      setError(err.message || 'No fue posible registrar la compra.');

      if (err.status === 401) {
        clearSessionToken();
        navigate('/iniciar-sesion', { replace: true });
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="compras-page" aria-labelledby="compras-title">
      <header className="compras-header">
        <h1 id="compras-title">Registrar compra</h1>
        <p>Registra los insumos adquiridos y actualiza las existencias de tu inventario.</p>
      </header>

      <section className="compras-card">
        {cargando ? (
          <p className="compras-empty">Cargando proveedores e insumos...</p>
        ) : (
          <form className="compras-form" onSubmit={handleSubmit} onChange={() => mensaje && setMensaje('')}>
            <div className="compra-field">
              <label htmlFor="compra-proveedor">Proveedor</label>
              <select
                id="compra-proveedor"
                value={proveedorId}
                onChange={(event) => setProveedorId(event.target.value)}
                required
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
              {proveedores.length === 0 && (
                <small>No hay proveedores activos registrados.</small>
              )}
            </div>

            <div className="compra-field">
              <label htmlFor="compra-fecha">Fecha de compra</label>
              <input
                id="compra-fecha"
                type="date"
                value={fecha}
                max={fechaLocalActual()}
                onChange={(event) => setFecha(event.target.value)}
                required
              />
            </div>

            <div className="compras-detalles-header">
              <div>
                <h2>Insumos de la compra</h2>
                <p>Agrega todos los insumos incluidos en esta compra.</p>
              </div>
              <button type="button" className="compra-add-button" onClick={agregarDetalle}>
                Agregar insumo
              </button>
            </div>

            {detalles.map((detalle, indice) => (
              <fieldset className="compra-linea" key={detalle.id}>
                <legend>Insumo {indice + 1}</legend>

                <div className="compra-linea-grid">
                  <div className="compra-field compra-insumo-field">
                    <label htmlFor={`insumo-${detalle.id}`}>Insumo</label>
                    <select
                      id={`insumo-${detalle.id}`}
                      value={detalle.insumoId}
                      onChange={(event) => actualizarDetalle(detalle.id, 'insumoId', event.target.value)}
                      required
                    >
                      <option value="">Selecciona un insumo</option>
                      {insumos.map((insumo) => (
                        <option key={insumo.id} value={insumo.id}>
                          {insumo.nombre} ({insumo.unidad})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="compra-field">
                    <label htmlFor={`cantidad-${detalle.id}`}>Cantidad</label>
                    <input
                      id={`cantidad-${detalle.id}`}
                      type="number"
                      min="0.001"
                      max="999999999.999"
                      step="0.001"
                      value={detalle.cantidad}
                      onChange={(event) => actualizarDetalle(detalle.id, 'cantidad', event.target.value)}
                      required
                    />
                  </div>

                  <div className="compra-field">
                    <label htmlFor={`precio-${detalle.id}`}>Precio unitario (COP)</label>
                    <input
                      id={`precio-${detalle.id}`}
                      type="number"
                      min="0.01"
                      max="999999999999.99"
                      step="0.01"
                      placeholder="Ej. 4500"
                      value={detalle.precioUnitario}
                      onChange={(event) => actualizarDetalle(detalle.id, 'precioUnitario', event.target.value)}
                      required
                    />
                  </div>

                  <div className="compra-linea-total">
                    <span>Subtotal</span>
                    <strong>
                      {formatoMoneda(Number(detalle.cantidad) * Number(detalle.precioUnitario))}
                    </strong>
                  </div>
                </div>

                {detalles.length > 1 && (
                  <button
                    type="button"
                    className="compra-remove-button"
                    onClick={() => quitarDetalle(detalle.id)}
                  >
                    Quitar insumo
                  </button>
                )}
              </fieldset>
            ))}

            {insumos.length === 0 && (
              <p className="compras-empty">
                No hay insumos registrados. Registra al menos uno antes de crear una compra.
              </p>
            )}

            {error && <p className="compras-feedback error" role="alert">{error}</p>}
            {mensaje && <p className="compras-feedback success" role="status">{mensaje}</p>}

            {!mensaje && <div className="compras-resumen">
              <span>Total de la compra</span>
              <strong>{formatoMoneda(total)}</strong>
            </div>}

            <div className="compras-submit">
              <button
                type="submit"
                disabled={guardando || proveedores.length === 0 || insumos.length === 0}
              >
                {guardando ? 'Registrando compra...' : 'Registrar compra'}
              </button>
            </div>
          </form>
        )}
      </section>
    </section>
  );
}
