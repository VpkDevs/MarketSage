const express = require("express");
const router = express.Router();

const scamKeywords = [
  "scam",
  "fraud",
  "fake",
  "offer",
  "money",
  "guarantee",
  "win",
  "prize",
  "urgent",
  "risk",
];

router.post("/", (req, res) => {
    try {
        const { text } = req.body;

        // Validate input type
        if (typeof text !== "string") {
            return res.status(400).json({ error: "Text must be a string" });
        }

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        // Calculate scam probability based on keyword analysis
        const keywordMatches = scamKeywords.filter((keyword) =>
            text.toLowerCase().includes(keyword)
        ).length;
        const scamProbability = Math.min(1, keywordMatches / scamKeywords.length); // Normalize to a value between 0 and 1

        res.json({ scamProbability });
    } catch (error) {
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});

module.exports = router;
</create_file>
