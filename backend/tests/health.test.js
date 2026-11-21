const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
    it('responde 200 con el estado de la API en JSON', async () => {
        await request(app)
            .get('/api/health')
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .expect({ status: 'ok' });
    });
});