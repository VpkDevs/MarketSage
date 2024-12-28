const request = require('supertest');
const express = require('express');
const sellerProfileRoutes = require('../routes/sellerProfile');

const app = express();
app.use(express.json());
app.use('/api/sellerProfile', sellerProfileRoutes);

describe('GET /api/sellerProfile/:sellerId', () => {
    it('should return a seller profile', async () => {
        const sellerId = '12345'; // Example seller ID
        const response = await request(app)
            .get(`/${sellerId}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', sellerId);
        expect(response.body).toHaveProperty('reputationMetrics');
    });
});
