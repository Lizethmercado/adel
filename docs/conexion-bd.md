# Conexión a PostgreSQL y prueba de conexión

**Sprint 1 · HT-03 · T12**

## 1. Propósito

El backend se conecta a PostgreSQL mediante Prisma. Esta tarea deja una única instancia del cliente y dos formas de comprobar que la conexión y las migraciones funcionan: una prueba automatizada y un script manual.

## 2. Componentes

| Archivo | Función |
| --- | --- |
| `backend/src/config/prisma.js` | Crea una sola instancia de `PrismaClient` que se reutiliza en toda la aplicación |
| `backend/tests/db.connection.test.js` | Prueba automatizada de conexión con Jest |
| `backend/scripts/verificar-conexion.js` | Script manual, se ejecuta con `npm run db:check` |

La conexión usa la variable `DATABASE_URL` del `.env` (ver `docs/variables-entorno.md`).

## 3. Pruebas automatizadas

| Prueba | Qué verifica |
| --- | --- |
| Consulta simple | La base responde a `SELECT 1` |
| Tablas de la migración | Existen las seis tablas del modelo: Negocio, Usuario, Insumo, Proveedor, Compra y DetalleCompra |

Se desarrollaron con TDD: primero fallaron con el error `Cannot find module '../src/config/prisma'`, porque el cliente no existía, y después pasaron al crear `prisma.js`. Los commits `test:` y `feat:` quedan en ese orden en el historial.

## 4. Decisión: omitir la prueba si no hay base de datos

El pipeline de GitHub Actions no incluye una base PostgreSQL. Para que estas pruebas no fallen allí, se omiten automáticamente cuando `DATABASE_URL` no está definida. En cada equipo se ejecutan con el `.env` local. Si más adelante el pipeline incorpora un servicio de PostgreSQL, se puede eliminar la omisión.

| Situación | Resultado de `npm test` |
| --- | --- |
| Con `.env` y PostgreSQL en marcha | 5 pruebas pasan |
| Sin `.env` (simula el pipeline) | 3 pasan y 2 se omiten, sin fallos |

Para reproducir la segunda fila en local, se renombra temporalmente el archivo (`Rename-Item .env .env.off`), se ejecuta `npm test` y se restaura (`Rename-Item .env.off .env`). En PowerShell, asignar una cadena vacía a la variable de entorno no sirve para esto, porque la elimina y `dotenv` vuelve a cargar el `.env`.

## 5. Cómo probarlo

1. Tener PostgreSQL en marcha y las migraciones aplicadas (`npx prisma migrate dev`).
2. Dentro de `backend/`: `npm install`, `npm test` y `npm run db:check`.
3. Resultado esperado de `db:check`: el mensaje "Conexión exitosa con PostgreSQL." y el número de negocios registrados.
4. Para comprobar el caso de error, definir una `DATABASE_URL` con una contraseña incorrecta solo para esa terminal y ejecutar `npm run db:check`: el script informa que no pudo conectar (error de autenticación) y termina con código de error.

## 6. Relación compra y detalle

En el esquema, una compra puede tener cero o más detalles. La regla de que toda compra tenga al menos un detalle se valida al registrar la compra (T34), dentro de la misma transacción.