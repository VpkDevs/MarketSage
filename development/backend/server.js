const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const scamDetectionRoutes = require("./routes/scamDetection");
const sellerProfileRoutes = require("./routes/sellerProfile");

const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(cors());

// Middleware
app.use(bodyParser.json());

// Routes
app.use("/api/scamDetection", scamDetectionRoutes);
app.use("/api/sellerProfile", sellerProfileRoutes);

app.use(bodyParser.json());

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
