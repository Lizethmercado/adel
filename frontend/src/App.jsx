import { Link, NavLink, Route, Routes } from 'react-router'
import HealthPage from './pages/HealthPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import BusinessPage from './pages/BusinessPage.jsx'
import InsumosPage from './pages/InsumosPage.jsx'
import InventarioPage from './pages/InventarioPage.jsx'
import ProveedoresPage from './pages/ProveedoresPage.jsx'
import ComprasPage from './pages/ComprasPage.jsx'
import ComparacionPage from './pages/ComparacionPage.jsx'

function HomePage() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-content">
        <h1 id="home-title">Compras e inventario</h1>
        <p>
          ADEL ayuda a los pequeños negocios de comidas rápidas a gestionar
          sus compras y controlar su inventario.
        </p>
        <Link className="action" to="/estado">
          Consultar estado del sistema
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" to="/" aria-label="ADEL, inicio">
            <span className="brand-mark" aria-hidden="true">A</span>
            ADEL
          </Link>

          <nav className="navigation" aria-label="Navegación principal">
            <NavLink to="/" end>Inicio</NavLink>
            <NavLink to="/estado">Estado del sistema</NavLink>
            <NavLink to="/registro">Registro</NavLink>
            <NavLink to="/iniciar-sesion">Iniciar sesión</NavLink>
            <NavLink to="/mi-negocio">Mi negocio</NavLink>
            <NavLink to="/insumos">Registrar insumos</NavLink>
            <NavLink to="/inventario">Inventario</NavLink>
            <NavLink to="/proveedores">Proveedores</NavLink>
            <NavLink to="/compras">Compras</NavLink>
            <NavLink to="/comparacion">Comparar precios</NavLink>
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