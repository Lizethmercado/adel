# Verificación en contenedores y cierre de la versión 1.1.0

**Sprint 3 · T50**

## 1. Objetivo

Comprobar que toda la aplicación (PostgreSQL, backend y frontend) se construye y se ejecuta desde cero con Docker, que el recorrido completo funciona en el navegador y que la versión 1.1.0 queda publicada.

## 2. Entorno

| Elemento | Valor |
| --- | --- |
| Fecha | [fecha de la prueba] |
| Commit de `develop` | [salida de `git rev-parse --short HEAD`] |
| Docker | [salida de `docker --version`] |
| Compose | [salida de `docker compose version`] |
| Imágenes | `postgres:16`, `node:20-alpine` o `node:22-alpine` según los Dockerfile, `nginx:alpine` |

## 3. Arranque desde cero

Se ejecutó `docker compose down -v` y luego `docker compose up --build -d`, partiendo de un volumen vacío.

| Comprobación | Resultado | Figura |
| --- | --- | --- |
| Servicios en ejecución | [db healthy, backend y frontend running] | [N] |
| Migraciones aplicadas al iniciar | [Cumple] | [N] |
| `GET /api/health` por el proxy de Nginx | [200 con `{"status":"ok"}`] | [N] |

## 4. Recorrido en el navegador

| Paso | Resultado | Figura |
| --- | --- | --- |
| Registro de usuario y negocio | [Cumple] | [N] |
| Rechazo de correo duplicado | [Cumple] | [N] |
| Redirección sin sesión | [Cumple] | [N] |
| Inicio de sesión | [Cumple] | [N] |
| Registro de insumos e inventario con resaltado | [Cumple] | [N] |
| Registro de proveedores | [Cumple] | [N] |
| Compra con varios insumos | [Cumple] | [N] |
| Evolución de precios | [Cumple] | [N] |
| Comparación entre proveedores | [Cumple] | [N] |
| Recarga de una ruta directa | [Cumple] | [N] |

## 5. Vista móvil

Se revisaron las pantallas con un ancho de [390] px usando las herramientas del navegador. [Describe lo que viste: si no hay desbordamientos, o qué defecto se encontró y qué se decidió.] (Figuras [N] a [N])

## 6. Persistencia

Tras `docker compose down` y `docker compose up -d`, el usuario y sus datos seguían disponibles gracias al volumen `adel_pgdata`. (Figura [N])

## 7. Cierre de la versión

| Paso | Evidencia |
| --- | --- |
| Rama `release/v1.1.0` creada desde `develop` | [Figura N] |
| Versión de los paquetes actualizada a 1.1.0 y `CHANGELOG.md` | [PR #N] |
| Pull request a `main` aprobado por [nombre] con el pipeline en verde | [PR #N] |
| Etiqueta `v1.1.0` | [Figura N] |
| Pull request de la release a `develop` | [PR #N] |

## 8. Limitaciones conocidas

- El frontend no tiene pruebas automatizadas; sus escenarios se verifican manualmente.
- Las pruebas de atomicidad no simulan un fallo interno a mitad de una transacción.
- La base de datos del contenedor no publica puerto hacia el equipo anfitrión; se accede con `docker compose exec db psql`.
- `npm audit` reporta vulnerabilidades en dependencias de desarrollo; no se aplicó `--force`.