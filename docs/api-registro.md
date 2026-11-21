# Registro de usuarios (POST /api/auth/register)

**Sprint 1 · HU-01 · T17 y T18**

## 1. Contrato

| Caso | Código | Respuesta |
| --- | --- | --- |
| Datos válidos | `201` | `{ mensaje, usuario: { id, nombreCompleto, correo }, negocio: { id, nombre } }` |
| Falta algún dato obligatorio | `400` | `{ mensaje, campos: [nombres de los campos faltantes] }` |
| Contraseña de menos de 8 caracteres | `400` | `{ mensaje }` con la longitud mínima |
| Correo ya registrado | `409` | `{ mensaje }`; no se crea usuario ni negocio |

Cuerpo de la solicitud: `nombreCompleto`, `nombreNegocio`, `correo` y `contrasena`. La respuesta nunca incluye la contraseña ni su hash.

## 2. Decisiones

- El correo se guarda sin espacios sobrantes y en minúsculas, por lo que `Ana@x.com` y ` ana@x.com ` son la misma cuenta.
- La contraseña se cifra con `bcryptjs` (10 rondas). Se eligió esta librería porque es JavaScript puro y no requiere compilación nativa en Windows ni en el pipeline.
- Usuario y negocio se crean en una sola transacción de Prisma (RN-06). Si falla la creación del usuario, el negocio no queda guardado.
- Si dos solicitudes con el mismo correo llegan a la vez, la restricción única de la base de datos se traduce también en un `409`.
- La lógica está separada en tres capas: rutas (`auth.routes.js`), controlador con las validaciones (`auth.controller.js`) y servicio con la transacción (`auth.service.js`).

## 3. Pruebas

La suite `backend/tests/auth.register.test.js` (T17) cubre los cuatro escenarios de HU-01 y consulta PostgreSQL para comprobar lo que quedó guardado. Se escribió antes que el endpoint (fase roja: los cuatro casos recibían `404`) y pasó al implementarlo (T18).

Para ejecutarla en local se usa una base aparte: crear `adel_test`, definir `DATABASE_URL` en esa terminal, aplicar `npx prisma migrate deploy` y ejecutar `npm test -- auth.register.test.js`. El pipeline levanta un servicio de PostgreSQL con esa misma base.

## 4. Alcance de la prueba de transacción

Las pruebas verifican que un correo duplicado no deja un negocio nuevo. La reversión ante un fallo interno a mitad de la transacción no tiene una prueba propia.