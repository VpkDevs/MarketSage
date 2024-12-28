// Event listener for the analyze button
document.getElementById('analyze-button').addEventListener('click', async () => {
    const text = document.getElementById('listing-text').value;
    const resultDiv = document.getElementById('result');

    // Call the backend API for scam detection
    const response = await fetch('/api/scamDetection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    const result = await response.json();
    resultDiv.innerText = `Scam Probability: ${result.scamProbability}`;
});

// Event listener for the profile button
document.getElementById('profile-button').addEventListener('click', async () => {
    const sellerId = document.getElementById('seller-id').value;
    const profileResultDiv = document.getElementById('profile-result');

    // Call the backend API for seller profile
    const response = await fetch(`/api/sellerProfile/${sellerId}`);
    const profile = await response.json();
    profileResultDiv.innerText = `Seller Profile: ${JSON.stringify(profile)}`;
});
