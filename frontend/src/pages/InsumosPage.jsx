
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { clearSessionToken, readSessionToken } from '../services/session.js';
import { registrarInsumo } from '../services/insumos.js';
import './InsumosPage.css';

export default function InsumosPage() {
  const navigate = useNavigate();
  const token = readSessionToken();

  const [form, setForm] = useState({
    nombre: '',
    unidad: '',
    cantidadActual: '',
    cantidadMinima: '',
    perecedero: false,
  });

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) return <Navigate to="/iniciar-sesion" replace />;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((actual) => ({
      ...actual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMensaje('');
    setLoading(true);

    try {
      await registrarInsumo(token, {
        nombre: form.nombre.trim(),
        unidad: form.unidad.trim(),
        cantidadActual: form.cantidadActual,
        cantidadMinima: form.cantidadMinima,
        perecedero: form.perecedero,
      });

      setMensaje('¡Insumo registrado correctamente!');
      setForm({
        nombre: '',
        unidad: '',
        cantidadActual: '',
        cantidadMinima: '',
        perecedero: false,
      });
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

  return (
    <section className="insumos-page" aria-labelledby="insumos-title">
      <header className="insumos-header">
        <h1 id="insumos-title">Nuevo insumo</h1>
        <p>
          Registra los ingredientes y materiales que utilizas
          en tu negocio para mantener organizado tu inventario.
        </p>
      </header>

      <div className="insumos-card">
        <form className="insumos-form" onSubmit={handleSubmit}>
          <div className="insumo-field full-width">
            <label htmlFor="nombre">Nombre del insumo</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              placeholder="Ej. Arroz, aceite, harina..."
              value={form.nombre}
              onChange={handleChange}
              required
              maxLength={100}
            />
          </div>

          <div className="insumo-field">
            <label htmlFor="unidad">Unidad de medida</label>
            <input
              id="unidad"
              name="unidad"
              type="text"
              placeholder="Ej. kg, litros, unidades"
              value={form.unidad}
              onChange={handleChange}
              required
            />
          </div>

          <div className="insumo-field">
            <label htmlFor="cantidadActual">Cantidad actual</label>
            <input
              id="cantidadActual"
              name="cantidadActual"
              type="number"
              placeholder="Ej. 25"
              min="0"
              max="999999999"
              step="any"
              value={form.cantidadActual}
              onChange={handleChange}
              required
            />
          </div>

          <div className="insumo-field full-width">
            <label htmlFor="cantidadMinima">Cantidad mínima de inventario</label>
            <input
              id="cantidadMinima"
              name="cantidadMinima"
              type="number"
              placeholder="Cantidad mínima antes de necesitar reposición"
              min="0"
              max="999999999"
              step="any"
              value={form.cantidadMinima}
              onChange={handleChange}
              required
            />
          </div>

          <div className="insumo-perecedero">
            <input
              id="perecedero"
              name="perecedero"
              type="checkbox"
              checked={form.perecedero}
              onChange={handleChange}
            />
            <label htmlFor="perecedero">
              Insumo perecedero
              <small>Marca esta opción si el producto puede dañarse o vencerse.</small>
            </label>
          </div>

          {error && (
            <p className="insumos-feedback error" role="alert">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="insumos-feedback success" role="status">
              {mensaje}
            </p>
          )}

          <div className="insumos-submit">
            <button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar insumo'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
