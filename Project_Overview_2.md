# Project Overview: MarketSage

## Project Description
MarketSage is a web application designed to provide AI-powered scam detection and seller profile retrieval. The application allows users to analyze listing texts for potential scams and retrieve detailed profiles of sellers based on their IDs.

## Current Implementation
### Backend
- **Server**: Built using Express.js, serving API endpoints for scam detection and seller profile retrieval.
- **Routes**:
  - `/api/scamDetection`: Analyzes text for scam-related keywords and returns a scam probability.
  - `/api/sellerProfile/:sellerId`: Retrieves seller profiles based on the seller ID.

### Frontend
- **User Interface**: Simple HTML structure with sections for scam detection and seller profile retrieval.
- **Functionality**: 
  - Users can input text to analyze for scams and receive a probability score.
  - Users can enter a seller ID to retrieve the corresponding seller profile.

## Areas for Improvement
1. **Error Handling**: Implement error handling in both the backend and frontend to manage invalid inputs and API failures.
2. **Testing**: Expand test coverage for both routes to include edge cases and error scenarios.
3. **User Experience**: Enhance the frontend with better styling, loading indicators, and error messages.
4. **Data Retrieval**: Implement actual data retrieval logic for seller profiles instead of returning mock data.

## Next Steps
1. Implement error handling in the backend routes.
2. Improve the frontend by adding input validation and error display mechanisms.
3. Expand test cases for both the scam detection and seller profile routes.
4. Connect the seller profile retrieval to a database or data source for real data.
