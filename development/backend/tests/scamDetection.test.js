const request = require("supertest");
const express = require("express");
const scamDetectionRoutes = require("../routes/scamDetection");

const app = express();
app.use(express.json());
app.use("/api/scamDetection", scamDetectionRoutes);

describe("POST /api/scamDetection", () => {
  it("should return a scam probability when text is provided", async () => {
    const response = await request(app)
      .post("/")
      .send({ text: "Sample listing text" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("scamProbability");
  });

  it("should return a 400 error when text is missing", async () => {
    const response = await request(app).post("/").send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Text is required");
  });

  it("should return a 400 error when text is not a string", async () => {
    const response = await request(app).post("/").send({ text: 123 });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Text must be a string");
  });
});
