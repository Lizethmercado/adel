# Variables de entorno y CORS del backend

**Sprint 1 · HT-02 · T9**

## 1. Propósito

Las variables de entorno separan la configuración (puertos, conexiones, llaves) del código. Cada integrante usa sus propios valores en su equipo y ningún secreto se sube al repositorio.

## 2. Archivos

| Archivo | ¿Se sube al repositorio? | Función |
| --- | --- | --- |
| `backend/.env.example` | Sí | Plantilla con valores de ejemplo |
| `backend/.env` | No (está en `.gitignore`) | Valores reales de cada integrante |
| `backend/src/config/env.js` | Sí | Carga el `.env` y centraliza la configuración |
| `backend/.gitignore` | Sí | Ignora `.env` y `.env.*`, y exceptúa `.env.example` |

## 3. Variables

| Variable | Descripción | Valor de ejemplo | Se usa desde |
| --- | --- | --- | --- |
| `NODE_ENV` | Entorno de ejecución | `development` | T9 |
| `PORT` | Puerto del servidor. El proxy del frontend apunta al 3000 | `3000` | T9 |
| `CORS_ORIGIN` | Orígenes del frontend permitidos, separados por coma | `http://localhost:5173` | T9 |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgresql://USUARIO:CONTRASENA@localhost:5432/adel_dev?schema=public` | T11 y T12 |
| `JWT_SECRET` | Llave para firmar el token de sesión | valor largo y aleatorio | T22 |

Si una variable no está definida, el código usa un valor por defecto: puerto `3000` y origen `http://localhost:5173`. `DATABASE_URL` y `JWT_SECRET` no tienen valor por defecto, porque no deben tenerlo.

## 4. Cómo configurarlo

1. Desde la raíz del repositorio, copiar la plantilla: `Copy-Item backend\.env.example backend\.env`.
2. Abrir `backend/.env` y completar los valores propios. `DATABASE_URL` se necesita desde la T11 y `JWT_SECRET` desde la T22.
3. Reiniciar el servidor (`npm run dev`) después de cambiar el `.env`.

## 5. CORS

CORS es la política del navegador que impide que una página consulte una API de otro origen si el servidor no lo autoriza. El backend solo autoriza los orígenes de `CORS_ORIGIN`, con el paquete `cors`, y lo registra antes de las rutas para que también responda a las solicitudes previas (preflight). Si el origen no está en la lista, la respuesta no incluye `Access-Control-Allow-Origin` y el navegador bloquea la lectura.

En desarrollo, el frontend consulta `/api` mediante el proxy de Vite hacia el puerto 3000, así que el navegador ve un único origen. La configuración de CORS queda lista para cuando el frontend y la API estén en orígenes distintos.

## 6. Verificación

Con el servidor en marcha (`npm run dev` dentro de `backend/`), se ejecutaron tres pruebas con `curl.exe` desde otra terminal. La ruta `/api/prueba` no existe, por lo que el `404` es el resultado correcto; lo que se verifica son las cabeceras CORS.

| Prueba | Comando | Resultado obtenido |
| --- | --- | --- |
| Origen permitido | `curl.exe -i -H "Origin: http://localhost:5173" http://localhost:3000/api/prueba` | `404` con `Access-Control-Allow-Origin: http://localhost:5173` |
| Solicitud previa (preflight) | `curl.exe -i -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type,authorization" http://localhost:3000/api/prueba` | `204` con `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE` y `Access-Control-Allow-Headers: content-type,authorization` |
| Origen no permitido | `curl.exe -i -H "Origin: http://sitio-malicioso.com" http://localhost:3000/api/prueba` | `404` sin la cabecera `Access-Control-Allow-Origin` |

Para comprobar que el `.env` real no se versiona:

| Prueba | Comando | Resultado obtenido |
| --- | --- | --- |
| `.env` ignorado | `git check-ignore -v backend/.env` | Muestra la regla `.env` de `backend/.gitignore` |
| Solo se versiona la plantilla | `git ls-files "*.env*"` | Lista únicamente `backend/.env.example` |

## 7. Decisiones

- La carga del `.env` está en `config/env.js` y no en `app.js`, para que las pruebas con Supertest importen la aplicación sin depender de un `.env`.
- Los orígenes se leen como lista separada por comas, para agregar otros (por ejemplo, el despliegue) sin tocar el código.
- El `.gitignore` ignora `.env.*` y exceptúa `.env.example`, para que la plantilla se versione y ningún `.env` real se suba por error.
- Cada integrante tiene su propio `.env`, porque las credenciales de PostgreSQL y las llaves son distintas en cada equipo.