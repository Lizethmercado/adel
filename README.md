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

## Estrategia de ramas (Gitflow)

- `main`: versión estable
- `develop`: integración
- `feature/*`: trabajo por ítem del backlog
- `hotfix/*`: correcciones urgentes
- `spike/*`: investigaciones técnicas

## Requisitos

- Node.js 22 (LTS). El mínimo es 20.19, que es lo que exige Vite 7.
- npm como gestor de paquetes.
- PostgreSQL.

## Cómo ejecutarlo

### Backend

1. Entrar a la carpeta: `cd backend`.
2. Copiar la plantilla de variables de entorno: `Copy-Item .env.example .env` (en PowerShell) o `cp .env.example .env` (en Linux y macOS). Ajustar los valores según [docs/variables-entorno.md](docs/variables-entorno.md).
3. Instalar las dependencias: `npm install`.
4. Iniciar el servidor en modo desarrollo: `npm run dev`. Corre en `http://localhost:3000`.

### Frontend

1. Entrar a la carpeta: `cd frontend`.
2. Instalar las dependencias: `npm install`.
3. Iniciar el servidor de desarrollo: `npm run dev`. Corre en `http://localhost:5173` y envía las consultas a `/api` al backend mediante un proxy.

## Tablero de trabajo

El avance del Sprint 1 se gestiona en un GitHub Project público: [Sprint 1 - ADEL](https://github.com/users/XimenaBarrera1/projects/1).

## Licencia

MIT