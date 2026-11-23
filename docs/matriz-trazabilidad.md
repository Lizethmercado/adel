# HT-06 · T43 / T44 — Matriz de trazabilidad

La matriz vincula los 31 escenarios de aceptación de ADEL con sus pruebas funcionales y registra el resultado de su ejecución consolidada en **T44**.

| ID | Escenario de aceptación | Prueba o evidencia | Resultado |
| --- | --- | --- | --- |
| HU-01-E01 | Registra al usuario y lo vincula a su negocio | [Registro exitoso](../backend/tests/auth.register.test.js#L68) | Aprobado |
| HU-01-E02 | Rechaza el registro si falta un campo obligatorio | [Campo obligatorio faltante](../backend/tests/auth.register.test.js#L103) | Aprobado |
| HU-01-E03 | Rechaza una contraseña de menos de ocho caracteres | [Contraseña corta](../backend/tests/auth.register.test.js#L120) | Aprobado |
| HU-01-E04 | Rechaza un correo duplicado sin crear otro usuario o negocio | [Correo duplicado](../backend/tests/auth.register.test.js#L131) | Aprobado |
| HU-02-E01 | Inicia sesión e identifica el negocio de la cuenta | [Inicio de sesión exitoso](../backend/tests/auth.login.test.js#L71) | Aprobado |
| HU-02-E02 | Devuelve el mismo mensaje general ante credenciales incorrectas | [Credenciales incorrectas](../backend/tests/auth.login.test.js#L86) | Aprobado |
| HU-02-E03 | Rechaza el inicio de sesión con datos incompletos | [Datos obligatorios faltantes](../backend/tests/auth.login.test.js#L108) | Aprobado |
| HU-02-E04 | Redirige al inicio de sesión al abrir una ruta protegida sin sesión | [Prueba manual de redirección](#hu-02-escenario-4) | Aprobado |
| HU-03-E01 | Registra un insumo | [Insumo registrado](../backend/tests/insumos.test.js#L104) | Aprobado |
| HU-03-E02 | Rechaza un nombre duplicado en el mismo negocio | [Nombre duplicado](../backend/tests/insumos.test.js#L132) | Aprobado |
| HU-03-E03 | Permite usar el mismo nombre en otro negocio | [Mismo nombre en otro negocio](../backend/tests/insumos.test.js#L166) | Aprobado |
| HU-03-E04 | Rechaza cantidades negativas | [Valores negativos](../backend/tests/insumos.test.js#L205) | Aprobado |
| HU-03-E05 | Permite registrar una cantidad en cero | [Cantidad en cero](../backend/tests/insumos.test.js#L232) | Aprobado |
| HU-07-E01 | Lista los insumos con su cantidad actual y mínima | [Listado](../backend/tests/inventario.test.js#L120) y [cantidades](../backend/tests/inventario.test.js#L194) | Aprobado |
| HU-07-E02 | Resalta los insumos en el mínimo o por debajo para reposición | [Cantidades devueltas por la API](../backend/tests/inventario.test.js#L194) y [prueba manual de resaltado](#hu-07-escenario-2) | Aprobado |
| HU-07-E03 | Muestra un mensaje cuando el negocio no tiene insumos | [Lista vacía en la API](../backend/tests/inventario.test.js#L253) y [prueba manual del mensaje](#hu-07-escenario-3) | Aprobado |
| HU-07-E04 | Solo muestra los insumos del negocio autenticado | [Aislamiento por negocio](../backend/tests/inventario.test.js#L168) | Aprobado |
| HU-09-E01 | Registra un proveedor activo en el negocio de la sesión | [Registro de proveedor](../backend/tests/proveedores.test.js#L67) | Aprobado |
| HU-09-E02 | Rechaza un nombre vacío sin guardar el proveedor | [Nombre vacío](../backend/tests/proveedores.test.js#L87) | Aprobado |
| HU-09-E03 | Desactiva un proveedor con compras y conserva su historial | [Desactivación con historial](../backend/tests/proveedores.test.js#L108) | Aprobado |
| HU-09-E04 | Excluye a un proveedor inactivo al registrar una compra | [Proveedor excluido del listado](../backend/tests/proveedores.test.js#L143) y [rechazo al registrar la compra](../backend/tests/compras.test.js#L245) | Aprobado |
| HU-10-E01 | Registra la compra, calcula el total y suma las cantidades al inventario en una transacción | [Registro y total](../backend/tests/compras.test.js#L102), [incremento de inventario](../backend/tests/compras.test.js#L135) y [ausencia de cambios parciales](../backend/tests/compras.test.js#L223) | Aprobado |
| HU-10-E02 | Rechaza datos inválidos o vacíos sin alterar el inventario | [Cantidad o precio inválidos](../backend/tests/compras.test.js#L147), [sin detalles](../backend/tests/compras.test.js#L175) y [sin proveedor](../backend/tests/compras.test.js#L190) | Aprobado |
| HU-10-E03 | Rechaza un proveedor inactivo o de otro negocio | [Proveedor inactivo](../backend/tests/compras.test.js#L245) y [proveedor ajeno](../backend/tests/compras.test.js#L206) | Aprobado |
| HU-10-E04 | Rechaza un insumo de otro negocio | [Insumo ajeno sin cambios parciales](../backend/tests/compras.test.js#L223) | Aprobado |
| HU-12-E01 | Agrupa el historial por proveedor y calcula la variación porcentual entre compras | [Variación para un mismo proveedor](../backend/tests/variacion-precios.test.js#L124) y [proveedores distintos](../backend/tests/variacion-precios.test.js#L174) | Aprobado |
| HU-12-E02 | Muestra el estado inicial o un mensaje cuando hay una sola compra o ninguna | [Una sola compra](../backend/tests/variacion-precios.test.js#L217), [compra con varias líneas](../backend/tests/variacion-precios.test.js#L244) y [sin compras](../backend/tests/variacion-precios.test.js#L278) | Aprobado |
| HU-12-E03 | Evita exponer compras o precios de otros negocios | [Rechazo de un insumo ajeno](../backend/tests/variacion-precios.test.js#L289) | Aprobado |
| HU-13-E01 | Ordena a los proveedores de menor a mayor por su último precio para el insumo | [Orden por último precio](../backend/tests/comparacion-precios.test.js#L131) | Aprobado |
| HU-13-E02 | Muestra la información disponible o un mensaje claro si hay un proveedor o no hay compras | [Un solo proveedor o ninguna compra](../backend/tests/comparacion-precios.test.js#L184) | Aprobado |
| HU-13-E03 | Solo toma en cuenta las compras del negocio autenticado | [Aislamiento por negocio](../backend/tests/comparacion-precios.test.js#L215) | Aprobado |

## HU-02 escenario 4

- Con el frontend en ejecución, abrir `/mi-negocio` desde una ventana privada.
- Verificar que la URL cambie a `/iniciar-sesion` y se muestre el formulario.
- Resultado observado: **Aprobado**. Al abrir `/mi-negocio` sin sesión activa en ventana privada, la aplicación redirige automáticamente a `/iniciar-sesion` y presenta el formulario de acceso.

## HU-07 escenario 2

- Registrar Harina con cantidad actual 3 y mínima 3.
- Registrar Azúcar con cantidad actual 1 y mínima 3.
- Abrir `/inventario` y verificar que Harina aparezca como «En el mínimo» y Azúcar como «Por debajo del mínimo», ambas resaltadas.
- Resultado observado: **Aprobado**. En `/inventario`, Harina aparece resaltada con la etiqueta «En el mínimo» y Azúcar aparece resaltada con la etiqueta «Por debajo del mínimo».

## HU-07 escenario 3

- Iniciar sesión con un negocio nuevo y abrir `/inventario` antes de registrar insumos.
- Verificar que aparezca el mensaje «Aún no hay insumos».
- Resultado observado: **Aprobado**. Al consultar `/inventario` con un negocio recién creado sin insumos, la pantalla muestra el mensaje «Aún no hay insumos».

## Evidencia transversal

[T42 · Prueba de integración del recorrido principal](../backend/tests/integracion-recorrido.test.js#L85), integrada en el [PR #46](https://github.com/Lizethmercado/adel/pull/46). Verifica registro, inicio de sesión, creación de insumo y proveedor, compra y consulta del último precio.

## Resultado de ejecución

- Base de datos de pruebas: `adel_test`.
- Comando: `npm.cmd test` desde `backend` (con `DATABASE_URL` y `JWT_SECRET` configurados).
- Resultado de Jest: **Aprobado** — 12 suites ejecutadas (`12 passed, 12 total`), 53 pruebas aprobadas (`53 passed, 53 total`).
- Pipeline de integración continua (GitHub Actions): **Aprobado** — workflow `CI` en verde sobre `develop` (`CI #117`, commit `ef269e7`).