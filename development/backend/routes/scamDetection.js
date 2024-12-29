const express = require('express');
const router = express.Router();

const scamKeywords = ['scam', 'fraud', 'fake', 'offer', 'money', 'guarantee', 'win', 'prize', 'urgent', 'risk'];

router.post('/', (req, res) => {
    const { text } = req.body;
    
    // Here you would implement the actual scam detection logic
    
    // Calculate scam probability based on keyword analysis
    const keywordMatches = scamKeywords.filter(keyword => text.toLowerCase().includes(keyword)).length;
    const scamProbability = Math.min(1, keywordMatches / scamKeywords.length); // Normalize to a value between 0 and 1

    res.json({ scamProbability });

    res.json({ scamProbability });
});

module.exports = router;
