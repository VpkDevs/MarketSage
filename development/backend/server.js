const express = require('express');
const bodyParser = require('body-parser');
const scamDetectionRoutes = require('./routes/scamDetection');
const sellerProfileRoutes = require('./routes/sellerProfile');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/scamDetection', scamDetectionRoutes);
app.use('/api/sellerProfile', sellerProfileRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
