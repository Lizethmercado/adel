const express = require('express');

const { crear } = require('../controllers/insumos.controller');
const requireSession = require('../middlewares/require-session.middleware');

const router = express.Router();

// Todas las rutas de insumos exigen sesión (R-01)
router.use(requireSession);

router.post('/', crear);

module.exports = router;