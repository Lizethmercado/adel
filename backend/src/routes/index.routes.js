const express = require('express');

const router = express.Router();
const authRoutes = require('./auth.routes');


router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
router.use('/auth', authRoutes);

module.exports = router;