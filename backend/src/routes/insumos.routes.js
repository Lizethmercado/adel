const express = require('express');
const { crear, listar } = require('../controllers/insumos.controller');
const requireSession = require('../middlewares/require-session.middleware');

const router = express.Router();

// Todas las rutas de insumos exigen sesión (R-01).
router.use(requireSession);
router.get('/', listar);
router.post('/', crear);

module.exports = router;