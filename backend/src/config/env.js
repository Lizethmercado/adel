require('dotenv').config({ quiet: true });

// Convierte "a, b, c" en ['a', 'b', 'c'], sin espacios ni elementos vacíos
function listaDesdeTexto(texto) {
    return (texto || '')
        .split(',')
        .map((valor) => valor.trim())
        .filter(Boolean);
}

const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    corsOrigins: listaDesdeTexto(process.env.CORS_ORIGIN || 'http://localhost:5173'),
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET
};

module.exports = config;