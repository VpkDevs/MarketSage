const request = require("supertest");
const express = require("express");
const sellerProfileRoutes = require("../routes/sellerProfile");

const app = express();
app.use(express.json());
app.use("/api/sellerProfile", sellerProfileRoutes);

describe("GET /api/sellerProfile/:sellerId", () => {
  it("should return a seller profile when a valid sellerId is provided", async () => {
    const sellerId = "12345"; // Example seller ID
    const response = await request(app).get(`/${sellerId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", sellerId);
    expect(response.body).toHaveProperty("reputationMetrics");
  });

  it("should return a 400 error when sellerId is missing", async () => {
    const response = await request(app).get(`/`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Valid seller ID is required"
    );
  });

  it("should return a 400 error when sellerId is not a string", async () => {
    const response = await request(app).get(`/123`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Valid seller ID is required"
    );
  });

  it("should return a 404 error when seller profile is not found", async () => {
    const sellerId = "nonexistent"; // Example of a non-existent seller ID
    const response = await request(app).get(`/${sellerId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error", "Seller profile not found");
  });
});
