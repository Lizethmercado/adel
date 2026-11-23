# ADEL

Plataforma web con analítica de datos e inteligencia artificial generativa para la gestión de compras e inventarios de mipymes de comidas rápidas en Sincelejo.

## Stack tecnológico

- **Frontend:** React (Vite)
- **Backend:** Node.js y Express (API REST)
- **Base de datos:** PostgreSQL con Prisma ORM
- **Pruebas:** Jest y Supertest
- **Integración continua:** GitHub Actions

## Integrantes

- Lizeth Paola Mercado Barboza (dueña del producto)
- Ximena Barrera Chávez (facilitadora)
- Roger José Mendoza Fortich

## Estructura del repositorio

- `backend/`: servidor y API REST
- `frontend/`: interfaz de usuario
- `docs/`: documentación, modelo de datos y actas

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Convenciones de ramas y commits](docs/convenciones.md)
- [Modelo entidad–relación](docs/modelo-er.md)
- [Variables de entorno y CORS](docs/variables-entorno.md)
- [Conexión a la base de datos](docs/conexion-bd.md)

## Estrategia de ramas (Gitflow)

- `main`: versión estable
- `develop`: integración
- `feature/*`: trabajo por ítem del backlog
- `hotfix/*`: correcciones urgentes
- `spike/*`: investigaciones técnicas

## Requisitos

- Node.js 22.12 o superior (Vite 7 exige 20.19+ o 22.12+). Versión usada en el desarrollo: 22.20.0.
- npm como gestor de paquetes.
- PostgreSQL 17 (o superior).

## Cómo ejecutarlo

### Base de datos

1. Crear la base de datos `adel_dev` en PostgreSQL. Por ejemplo, con `psql`: `CREATE DATABASE adel_dev;`.
2. Cada integrante usa su propio usuario y contraseña de PostgreSQL. Esos datos se escriben solo en el archivo `backend/.env`, que no se sube al repositorio.

### Backend

1. Entrar a la carpeta: `cd backend`.
2. Copiar la plantilla de variables de entorno: `Copy-Item .env.example .env` (en PowerShell) o `cp .env.example .env` (en Linux y macOS). Completar los valores propios, en especial `DATABASE_URL`, según [docs/variables-entorno.md](docs/variables-entorno.md).
3. Instalar las dependencias: `npm install`.
4. Aplicar las migraciones y generar el cliente de Prisma: `npx prisma migrate dev`. Esto crea las tablas del [modelo entidad–relación](docs/modelo-er.md) en la base `adel_dev`.
5. Iniciar el servidor en modo desarrollo: `npm run dev`. Corre en `http://localhost:3000`.

### Frontend

1. Entrar a la carpeta: `cd frontend`.
2. Instalar las dependencias: `npm install`.
3. Iniciar el servidor de desarrollo: `npm run dev`. Corre en `http://localhost:5173` y envía las consultas a `/api` al backend mediante un proxy.

## Pruebas

Las pruebas del backend se ejecutan con Jest y Supertest desde la carpeta `backend`:

```bash
npm test
```

El mismo comando se ejecuta de forma automática en GitHub Actions en cada push y pull request.

## Tablero de trabajo

El avance del Sprint 1 se gestiona en un GitHub Project público: [Sprint 1 - ADEL](https://github.com/users/XimenaBarrera1/projects/1).
El avance del Sprint 2 se gestiona en un GitHub Project público: [Sprint 2 - ADEL](https://github.com/users/XimenaBarrera1/projects/2).

## Licencia

MIT
