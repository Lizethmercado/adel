const express = require('express');

const app = express();

// Importar rutas y middlewares
const indexRoutes = require('./routes/index.routes');
const notFoundMiddleware = require('./middlewares/notFound.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

// Procesar solicitudes con datos JSON
app.use(express.json());

// Registrar las rutas de la API
app.use('/api', indexRoutes);

// Manejar rutas inexistentes
app.use(notFoundMiddleware);

// Manejar errores generales
app.use(errorMiddleware);

module.exports = app;
