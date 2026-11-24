import { useEffect, useRef } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router'
import HealthPage from './pages/HealthPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import BusinessPage from './pages/BusinessPage.jsx'
import InsumosPage from './pages/InsumosPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ProveedoresPage from './pages/ProveedoresPage.jsx'
import ComprasPage from './pages/ComprasPage.jsx'
import EvolucionPreciosPage from './pages/EvolucionPreciosPage.jsx'
import ComparacionPage from './pages/ComparacionPage.jsx'

function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <span className="home-eyebrow">ADEL · Gestión para tu negocio</span>

          <h1 id="home-title">
            Organiza las compras y el inventario de tu negocio
          </h1>

          <p>
            Una herramienta para que los pequeños negocios de comidas rápidas
            puedan gestionar sus insumos, organizar sus compras y consultar
            información sobre los precios.
          </p>

          <div className="home-hero-actions">
            <Link className="action" to="/registro">
              Regístrate gratis
              <span aria-hidden="true">→</span>
            </Link>

            <Link className="home-secondary-action" to="/iniciar-sesion">
              Ya tengo una cuenta
            </Link>
          </div>
        </div>

        <div className="home-hero-image">
          <img
            src="/imagenes/imagen1.png"
            alt="Ilustración de emprendimiento local"
          />
        </div>
      </section>

      <section className="home-section home-about" id="about">
        <div className="home-section-heading">
          <span className="home-eyebrow">Conoce la plataforma</span>
          <h2>¿Qué es ADEL?</h2>
          <p>
            ADEL es una plataforma web que facilita la gestión de compras e
            inventario de pequeños negocios de comidas rápidas en Sincelejo.
            Reúne herramientas para organizar la información y apoyar la toma
            de decisiones del negocio.
          </p>
        </div>

        <div className="home-info-grid">
          <article className="home-info-card home-card-turquoise">
            <img
              src="/imagenes/negocio.png"
              alt="Ilustración de un negocio"
            />
            <h3>Gestión de insumos</h3>
            <p>
              Registra y organiza los insumos que utiliza tu negocio.
            </p>
          </article>

          <article className="home-info-card home-card-yellow">
            <img
              src="/imagenes/estadisticas.png"
              alt="Ilustración de información organizada"
            />
            <h3>Control de inventario</h3>
            <p>
              Consulta y lleva un seguimiento de la información de tu
              inventario.
            </p>
          </article>

          <article className="home-info-card home-card-green">
            <img
              src="/imagenes/analisis.png"
              alt="Ilustración de análisis"
            />
            <h3>Análisis de precios</h3>
            <p>
              Consulta la evolución y compara los precios de los insumos.
            </p>
          </article>
        </div>
      </section>

      <section className="home-section home-tools" id="herramientas">
        <div className="home-section-heading">
          <span className="home-eyebrow">Herramientas disponibles</span>
          <h2>Todo más organizado para tu negocio</h2>
          <p>
            Accede directamente a los módulos que te ayudan a administrar
            las operaciones de tu negocio.
          </p>
        </div>

        <div className="home-tools-grid">
          <Link className="home-tool-card" to="/insumos">
            <span className="home-tool-number">01</span>
            <h3>Insumos</h3>
            <p>Registra los productos y materiales que utiliza tu negocio.</p>
            <span className="home-tool-link">Ir a insumos →</span>
          </Link>

          <Link className="home-tool-card" to="/inventario">
            <span className="home-tool-number">02</span>
            <h3>Inventario</h3>
            <p>Consulta y administra los registros de tu inventario.</p>
            <span className="home-tool-link">Ir a inventario →</span>
          </Link>

          <Link className="home-tool-card" to="/proveedores">
            <span className="home-tool-number">03</span>
            <h3>Proveedores</h3>
            <p>Organiza la información de tus proveedores.</p>
            <span className="home-tool-link">Ir a proveedores →</span>
          </Link>

          <Link className="home-tool-card" to="/compras">
            <span className="home-tool-number">04</span>
            <h3>Compras</h3>
            <p>Registra y consulta las compras de tu negocio.</p>
            <span className="home-tool-link">Ir a compras →</span>
          </Link>
        </div>
      </section>

      <section className="home-analysis-section">
        <div className="home-analysis-image">
          <img
            src="/imagenes/analisis.png"
            alt="Ilustración de análisis de información"
          />
        </div>

        <div className="home-analysis-copy">
          <span className="home-eyebrow">Información para decidir</span>
          <h2>Conoce mejor los precios de tus insumos</h2>
          <p>
            ADEL cuenta con herramientas para consultar cómo evolucionan
            los precios y comparar las opciones registradas.
          </p>

          <div className="home-analysis-links">
            <Link to="/evolucion-precios">
              Consultar evolución de precios →
            </Link>
            <Link to="/comparacion">
              Comparar precios →
            </Link>
          </div>
        </div>
      </section>

      <section className="home-benefits">
        <div className="home-section-heading">
          <span className="home-eyebrow">¿Por qué utilizar ADEL?</span>
          <h2>Organiza la información de tu negocio</h2>
        </div>

        <div className="home-benefits-grid">
          <article className="home-benefit-card">
            <img src="/imagenes/negocio.png" alt="" />
            <h3>Información centralizada</h3>
            <p>Reúne los registros de tu negocio en una misma plataforma.</p>
          </article>

          <article className="home-benefit-card">
            <img src="/imagenes/estadisticas.png" alt="" />
            <h3>Seguimiento del inventario</h3>
            <p>Consulta la información de los insumos registrados.</p>
          </article>

          <article className="home-benefit-card">
            <img src="/imagenes/recursos.png" alt="" />
            <h3>Compras organizadas</h3>
            <p>Mantén un registro de las compras de tu negocio.</p>
          </article>

          <article className="home-benefit-card">
            <img src="/imagenes/analisis.png" alt="" />
            <h3>Consulta de precios</h3>
            <p>Utiliza las herramientas de evolución y comparación.</p>
          </article>
        </div>
      </section>

      <section className="home-cta">
        <div>
          <span className="home-eyebrow">Empieza con ADEL</span>
          <h2>Organiza mejor la gestión de tu negocio</h2>
          <p>
            Regístrate y comienza a utilizar las herramientas disponibles
            para tu negocio de comidas rápidas.
          </p>
        </div>

        <Link className="action" to="/registro">
          Únete a ADEL
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="home-footer">
        <Link className="home-footer-brand" to="/">
          ADEL
        </Link>
        <p>
          Herramientas para la gestión de compras e inventario de negocios
          de comidas rápidas.
        </p>
        <small>© 2026 ADEL · Todos los derechos reservados</small>
      </footer>
    </div>
  )
}

export default function App() {

    const navigationRef = useRef(null)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!navigationRef.current?.contains(event.target)) {
        navigationRef.current
          ?.querySelectorAll('details[open]')
          .forEach((dropdown) => {
            dropdown.open = false
          })
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
    }
  }, [])

  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" to="/" aria-label="ADEL, inicio">
            <span className="brand-mark" aria-hidden="true">A</span>
            ADEL
          </Link>

                  <nav
            ref={navigationRef}
            className="navigation"
            aria-label="Navegación principal"
            onClick={(event) => {
              if (event.target.closest('a')) {
                navigationRef.current
                  ?.querySelectorAll('details[open]')
                  .forEach((dropdown) => {
                    dropdown.open = false
                  })
              }
            }}
          >
            <NavLink to="/" end>Inicio</NavLink>

            <NavLink to="/estado">Estado</NavLink>

            <details name="main-navigation" className="nav-dropdown">
              <summary>Mi cuenta</summary>
              <div className="nav-dropdown-menu">
                <NavLink to="/registro">Registro</NavLink>
                <NavLink to="/iniciar-sesion">Iniciar sesión</NavLink>
              </div>
            </details>

            <NavLink to="/mi-negocio">Mi negocio</NavLink>

            <details name="main-navigation" className="nav-dropdown">
              <summary>Gestión</summary>
              <div className="nav-dropdown-menu">
                <NavLink to="/insumos">Registrar insumos</NavLink>
                <NavLink to="/inventario">Inventario</NavLink>
                <NavLink to="/proveedores">Proveedores</NavLink>
                <NavLink to="/compras">Compras</NavLink>
              </div>
            </details>

            <details name="main-navigation" className="nav-dropdown">
              <summary>Análisis</summary>
              <div className="nav-dropdown-menu">
                <NavLink to="/evolucion-precios">Evolución de precios</NavLink>
                <NavLink to="/comparacion">Comparar precios</NavLink>
              </div>
            </details>
          </nav>
        </div>
      </header>

      <main className="shell main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/estado"
            element={
              <div className="status-page">
                <Link className="back-link" to="/">← Volver al inicio</Link>
                <HealthPage />
              </div>
            }
          />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/iniciar-sesion" element={<LoginPage />} />
          <Route path="/mi-negocio" element={<BusinessPage />} />
          <Route path="/insumos" element={<InsumosPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />
          <Route path="/compras" element={<ComprasPage />} />
          <Route path="/evolucion-precios" element={<EvolucionPreciosPage />} />
          <Route path="/comparacion" element={<ComparacionPage />} />
          <Route
            path="*"
            element={
              <section className="surface">
                <h1>Página no encontrada</h1>
                <Link className="action" to="/">Volver al inicio</Link>
              </section>
            }
          />
        </Routes>
      </main>
    </>
  )
}
