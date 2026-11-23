# Registro de insumos (POST /api/insumos)

**Sprint 1 · HU-03 · T24 y T25**

## 1. Contrato

La ruta exige sesión (`Authorization: Bearer <token>`). El negocio se toma de la sesión y no del cuerpo de la solicitud (R-01).

Cuerpo: `nombre`, `unidad`, `cantidadActual`, `cantidadMinima` y, opcionalmente, `perecedero` (booleano, `false` por defecto).

| Caso | Código | Respuesta |
| --- | --- | --- |
| Insumo válido | `201` | `{ id, nombre, unidad, cantidadActual, cantidadMinima, perecedero }` |
| Cantidad actual en cero | `201` | El insumo se registra con `0` disponibles |
| Mismo nombre en otro negocio | `201` | Sin conflicto |
| Falta un dato, cantidad negativa o valor no numérico | `400` | `{ mensaje, campos: [campos con error] }` |
| Nombre repetido en el mismo negocio | `409` | `{ mensaje }` |
| Sin sesión o token inválido | `401` | `{ mensaje }` |

## 2. Decisiones

- **Nombre normalizado.** Se guarda el nombre tal como lo escribió el usuario y, aparte, `nombreNormalizado` (sin espacios sobrantes, con espacios repetidos reducidos a uno y en minúsculas). La unicidad `(negocioId, nombreNormalizado)` hace que `Arroz`, `arroz` y ` ARROZ ` cuenten como el mismo insumo.
- **Unicidad en la base de datos.** El código no comprueba primero si existe: intenta guardar y traduce el error de unicidad (`P2002`) en un `409`. Así también se detectan dos solicitudes simultáneas.
- **Cantidades numéricas.** Prisma devuelve los decimales como texto, por lo que el controlador los convierte a número con `Number()` antes de responder.
- **Valores aceptados.** Se aceptan números y texto numérico, porque el formulario envía texto. El máximo permitido es `999999999`, acorde al tipo `Decimal(12, 3)`.

## 3. Pruebas

La suite `backend/tests/insumos.test.js` (T24) se escribió antes que el endpoint (fase roja, `404`) y pasó en verde al implementarlo en T25. Cada prueba lleva en su nombre el escenario de HU-03 que verifica.