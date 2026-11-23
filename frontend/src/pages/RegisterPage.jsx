
import { useRef, useState } from 'react';
import './RegisterPage.css';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInput = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const datos = Object.fromEntries(
      new FormData(form).entries()
    );

    setIsSubmitting(true);
    setFeedback('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(datos),
      });

      const resultado = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          resultado.mensaje || 'No fue posible completar el registro.'
        );
      }

      setFeedback(resultado.mensaje || 'Registro exitoso.');
      form.reset();
      setShowPassword(false);

    } catch (error) {
      if (error instanceof TypeError) {
        setFeedback('No se pudo conectar con el servidor. Inténtalo nuevamente.');
      } else {
        setFeedback(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function togglePassword() {
    setShowPassword((visible) => !visible);
    passwordInput.current?.focus();
  }

  return (
    <section className="register-page" aria-labelledby="register-title">
      <aside className="register-intro" aria-labelledby="register-intro-title">
        <span className="register-wordmark">ADEL</span>
        <div>
          <h2 id="register-intro-title">Empieza con tu negocio</h2>
          <p>Organiza tus compras e inventario en un solo lugar.</p>
        </div>
      </aside>

      <div className="register-panel">
        <h1 id="register-title">Crea tu cuenta</h1>
        <p>Ingresa tus datos y el nombre de tu negocio.</p>

        <form
          className="register-form"
          onSubmit={handleSubmit}
          onInput={() => setFeedback('')}
          aria-busy={isSubmitting}
        >
          <div className="register-field">
            <label htmlFor="register-name">Nombre completo</label>
            <input
              id="register-name"
              name="nombreCompleto"
              autoComplete="name"
              pattern={'.*\\S.*'}
              title="Escribe tu nombre completo."
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-business">Nombre del negocio</label>
            <input
              id="register-business"
              name="nombreNegocio"
              autoComplete="organization"
              pattern={'.*\\S.*'}
              title="Escribe el nombre de tu negocio."
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-email">Correo electrónico</label>
            <input
              id="register-email"
              name="correo"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-password">Contraseña</label>
            <div className="register-password">
              <input
                ref={passwordInput}
                id="register-password"
                name="contrasena"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                aria-describedby="register-password-hint"
                required
              />
              <button
                type="button"
                className="register-password-toggle"
                aria-controls="register-password"
                onClick={togglePassword}
              >
                {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              </button>
            </div>
            <small id="register-password-hint">
              Usa al menos 8 caracteres.
            </small>
          </div>

          <button
            className="action register-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creando cuenta...' : 'Continuar'}
          </button>

          <p className="register-feedback" role="status">
            {feedback}
          </p>
        </form>
      </div>
    </section>
  );
}
