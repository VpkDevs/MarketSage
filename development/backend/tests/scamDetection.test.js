const request = require('supertest');
const express = require('express');
const scamDetectionRoutes = require('../routes/scamDetection');

const app = express();
app.use(express.json());
app.use('/api/scamDetection', scamDetectionRoutes);

describe('POST /api/scamDetection', () => {
    it('should return a scam probability', async () => {
        const response = await request(app)
            .post('/')
            .send({ text: 'Sample listing text' });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('scamProbability');
    });
});
