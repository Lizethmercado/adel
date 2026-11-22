
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  clearSessionToken,
  readSessionToken,
} from '../services/session.js';
import {
  eliminarProveedor,
  listarProveedores,
  registrarProveedor,
} from '../services/proveedores.js';
import './ProveedoresPage.css';

export default function ProveedoresPage() {
  const navigate = useNavigate();
  const token = readSessionToken();

  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
  });

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [proveedorEliminando, setProveedorEliminando] = useState(null);

  

   const cargarProveedores = useCallback(async () => {
    setLoadingLista(true);
    setError('');

    try {
      const data = await listarProveedores(token, estadoFiltro);
      setProveedores(data.proveedores || []);
    } catch (err) {
      setError(err.message);

      if (err.status === 401) {
        clearSessionToken();
        navigate('/iniciar-sesion', { replace: true });
      }
    } finally {
      setLoadingLista(false);
    }
  }, [token, estadoFiltro, navigate]);

  useEffect(() => {
    if (token) {
      cargarProveedores();
    }
  }, [token, cargarProveedores]);



  const proveedoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return proveedores.filter((proveedor) =>
      proveedor.nombre.toLowerCase().includes(termino)
    );
  }, [proveedores, busqueda]);

  if (!token) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  }



  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMensaje('');
    setLoading(true);

    try {
      await registrarProveedor(token, {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
      });

      setForm({ nombre: '', telefono: '' });
      setMensaje('Proveedor registrado correctamente.');
      await cargarProveedores();
    } catch (err) {
      setError(err.message);

      if (err.status === 401) {
        clearSessionToken();
        navigate('/iniciar-sesion', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminar(proveedor) {
    const confirmar = window.confirm(
      `¿Deseas eliminar o desactivar al proveedor "${proveedor.nombre}"?`
    );

    if (!confirmar) return;

    setError('');
    setMensaje('');
    setProveedorEliminando(proveedor.id);

    try {
      const data = await eliminarProveedor(token, proveedor.id);

      setMensaje(data.mensaje || 'Operación realizada correctamente.');
      await cargarProveedores();
    } catch (err) {
      setError(err.message);

      if (err.status === 401) {
        clearSessionToken();
        navigate('/iniciar-sesion', { replace: true });
      }
    } finally {
      setProveedorEliminando(null);
    }
  }

  return (
    <section className="proveedores-page" aria-labelledby="proveedores-title">
      <header className="proveedores-header">
        <div>
          <h1 id="proveedores-title">Proveedores</h1>
          <p>
            Administra los proveedores que suministran productos e insumos
            para tu negocio.
          </p>
        </div>
      </header>

      <section className="proveedores-card" aria-labelledby="registro-title">
        <h2 id="registro-title">Registrar proveedor</h2>

        <form className="proveedores-form" onSubmit={handleSubmit}>
          <div className="proveedor-field">
            <label htmlFor="nombre">Nombre del proveedor</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              placeholder="Ej. Distribuidora del Caribe"
              value={form.nombre}
              onChange={handleChange}
              maxLength={100}
              required
            />
          </div>

          <div className="proveedor-field">
            <label htmlFor="telefono">Teléfono (opcional)</label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              placeholder="Ej. 3001234567"
              value={form.telefono}
              onChange={handleChange}
              maxLength={30}
            />
          </div>

          <div className="proveedores-submit">
            <button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar proveedor'}
            </button>
          </div>
        </form>
      </section>

      <section className="proveedores-card" aria-labelledby="listado-title">
        <div className="proveedores-list-header">
          <div>
            <h2 id="listado-title">Listado de proveedores</h2>
            <p>Consulta y administra tus proveedores registrados.</p>
          </div>
        </div>

        <div className="proveedores-filtros">
          <div className="proveedor-field">
            <label htmlFor="buscar">Buscar proveedor</label>
            <input
              id="buscar"
              type="search"
              placeholder="Escribe un nombre..."
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
          </div>

          <div className="proveedor-field">
            <label htmlFor="estadoFiltro">Estado</label>
            <select
              id="estadoFiltro"
              value={estadoFiltro}
              onChange={(event) => setEstadoFiltro(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="proveedores-feedback error" role="alert">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="proveedores-feedback success" role="status">
            {mensaje}
          </p>
        )}

        {loadingLista ? (
          <p className="proveedores-empty">Cargando proveedores...</p>
        ) : proveedoresFiltrados.length === 0 ? (
          <p className="proveedores-empty">
            {busqueda.trim()
              ? 'No se encontraron proveedores con ese nombre.'
              : 'Todavía no tienes proveedores registrados.'}
          </p>
        ) : (
          <div className="proveedores-table-wrapper">
            <table className="proveedores-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedoresFiltrados.map((proveedor) => (
                  <tr key={proveedor.id}>
                    <td>{proveedor.nombre}</td>
                    <td>{proveedor.telefono || 'No registrado'}</td>
                    <td>
                      <span
                        className={`proveedor-estado ${
                          proveedor.estado === 'ACTIVO' ? 'activo' : 'inactivo'
                        }`}
                      >
                        {proveedor.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="proveedor-delete"
                        onClick={() => handleEliminar(proveedor)}
                        disabled={
                          proveedorEliminando === proveedor.id ||
                          proveedor.estado === 'INACTIVO'
                        }
                      >
                        {proveedorEliminando === proveedor.id
                          ? 'Procesando...'
                          : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
