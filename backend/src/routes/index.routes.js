const express = require('express');

const router = express.Router();
const authRoutes = require('./auth.routes');
const loginRoutes = require('./login.routes');
const insumosRoutes = require('./insumos.routes');


router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
router.use('/auth', authRoutes);
router.use(loginRoutes);
router.use('/insumos', insumosRoutes);
module.exports = router;