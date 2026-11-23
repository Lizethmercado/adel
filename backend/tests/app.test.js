const express = require('express');
const request = require('supertest');

const app = require('../src/app');
const errorMiddleware = require('../src/middlewares/error.middleware');

const errorApp = express();

errorApp.get('/error-prueba', (req, res, next) => {
    next(new Error('Error de prueba'));
});

errorApp.get('/error-cliente', (req, res, next) => {
    const error = new Error('Solicitud incorrecta');
    error.statusCode = 400;

    next(error);
});

errorApp.use(errorMiddleware);

describe('Pruebas del backend ADEL', () => {

    test('Debe responder 404 cuando se solicita una ruta inexistente', async () => {
        const response = await request(app).get('/api/ruta-inexistente');

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            mensaje: 'Ruta no encontrada: /api/ruta-inexistente'
        });
    });

    test('Debe responder 500 cuando ocurre un error interno', async () => {
        const response = await request(errorApp).get('/error-prueba');

        expect(response.status).toBe(500);

        expect(response.body).toEqual({
            mensaje: 'Error de prueba'
        });
    });

    test('Debe responder 400 cuando ocurre un error de solicitud incorrecta', async () => {
        const response = await request(errorApp).get('/error-cliente');

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            mensaje: 'Solicitud incorrecta'
        });
    });

});
