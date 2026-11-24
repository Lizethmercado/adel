# Cambios

## 1.1.0

### Interfaz
- Sistema visual unificado: paleta, tipografía, espaciados y botones (T46).
- Navegación mejorada en escritorio y móvil, y vistas de acceso refinadas (T46).
- Tablas, formularios, tarjetas, mensajes vacíos e insignias de estado estandarizados en las pantallas operativas, sin desbordamientos en móvil (T47).

### Contenedores
- Dockerfile del backend y del frontend, con Nginx como proxy de `/api` (T48).
- `docker-compose.yml` con PostgreSQL 16 y volumen persistente, backend con migraciones automáticas y frontend (T49).
- Ejecución con un solo comando: `docker compose up --build`.

## 1.0.0

Primera versión: registro e inicio de sesión, insumos e inventario, proveedores, compras, evolución y comparación de precios.