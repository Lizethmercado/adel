function errorMiddleware(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        mensaje: err.message || 'Error interno del servidor'
    });
}

module.exports = errorMiddleware;
