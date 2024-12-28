const express = require('express');
const router = express.Router();

// Mock function for scam detection
router.post('/', (req, res) => {
    const { text } = req.body;
    
    // Here you would implement the actual scam detection logic
    const scamProbability = Math.random(); // Placeholder for actual logic

    res.json({ scamProbability });
});

module.exports = router;
