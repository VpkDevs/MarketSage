// Event listener for the analyze button
document
  .getElementById("analyze-button")
  .addEventListener("click", async () => {
    const text = document.getElementById("listing-text").value;
    const resultDiv = document.getElementById("result");

    // Input validation
    if (!text) {
      resultDiv.innerText = "Please enter text to analyze.";
      return;
    }

    // Call the backend API for scam detection
    const response = await fetch("/api/scamDetection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();

    // Error handling
    if (!response.ok) {
      resultDiv.innerText = `Error: ${result.error}`;
      return;
    }

    resultDiv.innerText = `Scam Probability: ${result.scamProbability}`;
  });

// Event listener for the profile button
document
  .getElementById("profile-button")
  .addEventListener("click", async () => {
    const sellerId = document.getElementById("seller-id").value;
    const profileResultDiv = document.getElementById("profile-result");

    // Input validation
    if (!sellerId) {
      profileResultDiv.innerText = "Please enter a seller ID.";
      return;
    }

    // Call the backend API for seller profile
    const response = await fetch(`/api/sellerProfile/${sellerId}`);
    const profile = await response.json();

    // Error handling
    if (!response.ok) {
      profileResultDiv.innerText = `Error: ${profile.error}`;
      return;
    }

    profileResultDiv.innerText = `Seller Profile: ${JSON.stringify(profile)}`;
  });
