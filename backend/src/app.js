const express = require('express');
const cors = require('cors');

const config = require('./config/env');

const app = express();

// Importar rutas y middlewares
const indexRoutes = require('./routes/index.routes');
const notFoundMiddleware = require('./middlewares/notFound.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

// Permitir solicitudes del frontend (solo los orígenes configurados)
app.use(cors({ origin: config.corsOrigins }));

// Procesar solicitudes con datos JSON
app.use(express.json());

// Registrar las rutas de la API
app.use('/api', indexRoutes);

// Manejar rutas inexistentes
app.use(notFoundMiddleware);

// Manejar errores generales
app.use(errorMiddleware);

module.exports = app;