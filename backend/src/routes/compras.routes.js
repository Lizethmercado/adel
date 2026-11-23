const express = require('express');
const { crear } = require('../controllers/compras.controller');
const requireSession = require('../middlewares/require-session.middleware');

const router = express.Router();

router.post('/', requireSession, crear);

module.exports = router;