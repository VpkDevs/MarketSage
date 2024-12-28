# MVP Project Structure

## Directory Structure
- **/frontend**: Contains the web interface files.
  - **index.html**: Main HTML file for the application.
  - **styles.css**: CSS file for styling the application.
  - **app.js**: JavaScript file for frontend logic.

- **/backend**: Contains the backend service files.
  - **server.js**: Main server file using Express.js.
  - **routes/**: Directory for API route handlers.
    - **scamDetection.js**: Route for scam detection functionality.
    - **sellerProfile.js**: Route for seller profile functionality.
  - **models/**: Directory for data models.
    - **seller.js**: Model for seller data.
    - **scamDetection.js**: Model for scam detection data.

- **/data**: Directory for storing data files.
  - **sellers.json**: JSON file for storing seller profiles.
  - **scamResults.json**: JSON file for storing scam detection results.

## Initial Tasks
1. Set up the frontend structure with basic HTML, CSS, and JavaScript files.
2. Create the backend server using Express.js and define the necessary routes.
3. Implement the core functionalities for scam detection and seller profiles.
4. Connect the frontend to the backend services.

This structure will provide a solid foundation for developing the MVP and allow for future enhancements.
