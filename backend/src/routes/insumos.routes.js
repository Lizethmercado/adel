const express = require('express');
const {
    crear,
    listar,
    obtenerVariacionPrecios,
    obtenerComparacionPrecios
} = require('../controllers/insumos.controller');
const requireSession = require('../middlewares/require-session.middleware');

const router = express.Router();

// Todas las rutas de insumos exigen sesión (R-01).
router.use(requireSession);

router.get('/', listar);
router.get('/:insumoId/variacion-precios', obtenerVariacionPrecios);
router.get('/:insumoId/comparacion', obtenerComparacionPrecios);
router.post('/', crear);

module.exports = router;