const express = require('express');

const { crear, listar, eliminar } = require('../controllers/proveedores.controller');
const requireSession = require('../middlewares/require-session.middleware');

const router = express.Router();

// Todas las rutas de proveedores exigen sesión (R-01)
router.use(requireSession);

router.post('/', crear);
router.get('/', listar);
router.delete('/:id', eliminar);

module.exports = router;