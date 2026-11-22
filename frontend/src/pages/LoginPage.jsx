import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { login, saveSessionToken } from '../services/session.js';
import './RegisterPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const datos = new FormData(event.currentTarget);
    const correo = datos.get('correo');
    const contrasena = datos.get('contrasena');

    setError('');
    setIsSubmitting(true);

    try {
      const token = await login(correo, contrasena);
      saveSessionToken(token);
      navigate('/mi-negocio', { replace: true });
    } catch (failure) {
      setError(
        failure instanceof TypeError
          ? 'No se pudo conectar con el servidor. Inténtalo nuevamente.'
          : failure.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="register-page" aria-labelledby="login-title">
      <aside className="register-intro" aria-labelledby="login-intro-title">
        <span className="register-wordmark">ADEL</span>
        <div>
          <h2 id="login-intro-title">Vuelve a tu negocio</h2>
          <p>Consulta tus compras y controla tu inventario.</p>
        </div>
      </aside>

      <div className="register-panel">
        <h1 id="login-title">Inicia sesión</h1>
        <p>Ingresa el correo y la contraseña de tu cuenta.</p>

        <form
          className="register-form"
          onSubmit={handleSubmit}
          onInput={() => setError('')}
          aria-busy={isSubmitting}
        >
          <div className="register-field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              name="correo"
              type="email"
              autoComplete="username"
              readOnly={isSubmitting}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="register-password">
              <input
                id="login-password"
                name="contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                readOnly={isSubmitting}
                required
              />
              <button
                className="register-password-toggle"
                type="button"
                aria-controls="login-password"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              </button>
            </div>
          </div>

          <button className="action register-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>

          <p className="register-feedback" role="alert">{error}</p>
        </form>

        <p>¿Aún no tienes una cuenta? <Link to="/registro">Regístrate</Link></p>
      </div>
    </section>
  );
}