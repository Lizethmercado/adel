const config = require('./config/env');
const app = require('./app');

app.listen(config.port, () => {
    console.log(`Servidor ejecutándose en el puerto ${config.port}`);
});
