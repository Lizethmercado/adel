# Esquema de Prisma y migración inicial

**Sprint 1 · HT-03 · T11**

## 1. Propósito

El esquema de Prisma (`backend/prisma/schema.prisma`) implementa en PostgreSQL el modelo entidad–relación definido en la T10 ([modelo-er.md](modelo-er.md)). La migración inicial crea las tablas, las claves y las restricciones, y queda versionada en el repositorio para que cada integrante pueda recrear la base con un solo comando.

## 2. Versión y herramientas

| Herramienta | Versión | Observación |
| --- | --- | --- |
| Prisma CLI y `@prisma/client` | 6.19.3 | Se fija la serie 6 porque el backend usa CommonJS (`require`) |
| PostgreSQL | 17 | Base local `adel_dev` |
| Node.js | 22.20.0 | Mínimo 22.12 (ver README) |

## 3. Correspondencia entre el modelo ER y el esquema

| Entidad del modelo ER | Modelo de Prisma | Tabla en PostgreSQL |
| --- | --- | --- |
| Negocio | `Negocio` | `Negocio` |
| Usuario | `Usuario` | `Usuario` |
| Insumo | `Insumo` | `Insumo` |
| Proveedor | `Proveedor` | `Proveedor` |
| Compra | `Compra` | `Compra` |
| Detalle de compra | `DetalleCompra` | `DetalleCompra` |

El enumerado `EstadoProveedor` (`ACTIVO`, `INACTIVO`) representa el estado del proveedor.

## 4. Reglas del modelo reflejadas en el esquema

| Regla | Cómo se implementa |
| --- | --- |
| RN-06: un negocio tiene un solo usuario | `Usuario.negocioId` es obligatorio y único (`@unique`) |
| Correo único por cuenta | `Usuario.correo` con `@unique` |
| HU-03: nombre único por negocio | `@@unique([negocioId, nombreNormalizado])` en `Insumo` |
| HU-03: el mismo nombre puede existir en otro negocio | La unicidad es compuesta, no solo sobre el nombre |
| HU-03: `perecedero` es opcional | `@default(false)` |
| HU-09: estado del proveedor | `EstadoProveedor`, con valor inicial `ACTIVO` |
| HU-09: un proveedor con compras se desactiva, no se borra | `onDelete: Restrict` en la relación `Compra` → `Proveedor` |
| RN-07: el detalle no guarda unidad | `DetalleCompra` solo tiene `cantidad` y `precioUnitario`; la unidad es la del insumo |
| HU-10: una compra tiene uno o más detalles | Relación 1 a N `Compra` → `DetalleCompra` (`onDelete: Cascade`) |
| HU-12 y HU-13: orden de compras de la misma fecha | `Compra.creadoEn` con valor por defecto `now()` |
| Cantidades y dinero sin errores de redondeo | Tipo `Decimal`: cantidades `(12,3)`, importes `(14,2)` |

## 5. Lo que no se resuelve en el esquema

Estas reglas dependen de la lógica de la API y se implementan en tareas posteriores:

- **`nombreNormalizado`:** se calcula en el backend (T25) con una función única: recortar espacios, reducir los interiores a uno y pasar a minúsculas.
- **Correo en minúsculas:** se guarda normalizado en el registro (T18).
- **Aislamiento por negocio (R-01):** la API filtra por el negocio del usuario autenticado; el esquema solo aporta las claves foráneas.
- **Transacciones:** el registro (HU-01) y la compra (HU-10) usan transacciones de Prisma.
- **Proveedor activo en la compra:** se valida en la API (T34).

## 6. Cómo recrear la base

1. Tener PostgreSQL en marcha y crear la base: `CREATE DATABASE adel_dev;`.
2. En `backend/`, copiar la plantilla: `Copy-Item .env.example .env`, y ajustar `DATABASE_URL` con credenciales propias.
3. Instalar dependencias: `npm install`.
4. Aplicar las migraciones: `npx prisma migrate dev`.

## 7. Verificación

| Prueba | Comando | Resultado obtenido |
| --- | --- | --- |
| Esquema válido | `npx prisma validate` | "The schema is valid" |
| Migración aplicada | `npx prisma migrate dev --name init` | Crea y aplica `20261121021318_init`; la base queda sincronizada con el esquema |
| Cliente generado | (paso final de `migrate dev`) | "Generated Prisma Client (v6.19.3)" |
| Tablas creadas | `psql -U postgres -d adel_dev -c "\dt"` | Seis tablas del modelo y `_prisma_migrations` (7 filas) |
| Unicidades e índices | `psql -U postgres -d adel_dev -c "SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('Insumo','Usuario','Proveedor','Compra','DetalleCompra') ORDER BY tablename, indexname;"` | 13 índices, entre ellos `Insumo_negocioId_nombreNormalizado_key`, `Usuario_negocioId_key` y `Usuario_correo_key` |

El nombre de la migración usa la fecha en hora UTC.

## 8. Decisiones

- Se usa el generador clásico `prisma-client-js`, que es compatible con CommonJS y genera el cliente dentro de `node_modules`, sin agregar archivos al código fuente.
- No se usa `prisma.config.ts`: el esquema lee `DATABASE_URL` directamente del `.env`, lo que simplifica la configuración del equipo.
- Las migraciones se versionan en el repositorio (`backend/prisma/migrations`), incluido `migration_lock.toml`.
- Se fija la serie 6 de Prisma para que todo el equipo use la misma versión y la instalación sea reproducible. No se actualiza a la serie 8, que cambia el flujo de configuración.

## Nota sobre Compra y DetalleCompra

La relación Compra–DetalleCompra permite cero o más detalles en el esquema. El mínimo de un detalle por compra se valida al registrar la compra (T34), dentro de la misma transacción.