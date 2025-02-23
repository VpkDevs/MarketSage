# MarketSage

Your Intelligent Marketplace Guide - A smart shopping assistant for Chinese marketplaces.

## Key Features

- **AI-Powered Scam Detection**: Analyzes text for scam keywords and calculates scam probability.
- **Seller DNA Profiling**: Retrieves and displays seller profiles based on seller ID.
- **Smart Risk Assessment**: Dynamic risk scoring and contextual warnings for users.
- **Predictive Price Modeling**: Implemented using machine learning algorithms to forecast price trends.
- **Cross-Platform Price Intelligence**: Not yet implemented.
- **Personalized Product Discovery**: Not yet implemented.
- **Smart Alerts**: Not yet implemented.
- **Crowdsourced Verification**: Not yet implemented.
- **Smart Translation**: Not yet implemented.
- **Visual Search Enhancement**: Not yet implemented.

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/MarketSage.git
   cd MarketSage
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## Roadmap

- **Q1 2024**: Implement AI-Powered Scam Detection.
- **Q2 2024**: Implement Seller DNA Profiling.
- **Q3 2024**: Implement Cross-Platform Price Intelligence.

## Contribution Guidelines

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with clear messages.
4. Push your branch and create a pull request.

## Additional Tasks

- Update .gitignore to exclude unnecessary files.
- Verify and update requirements.txt.
- Create a virtual environment if none exists.
- Document setup process in README.md.

This file should be kept up-to-date with major changes and feature implementations to ensure it accurately reflects the current state of the project.

## Project Overview

MarketSage is an intelligent Chinese marketplace assistant designed to provide users with a smart shopping experience. It aims to solve the problem of scams, unreliable sellers, and language barriers in Chinese marketplaces. It differs from existing solutions by offering AI-powered scam detection, seller DNA profiling, smart risk assessment, and predictive price modeling.

## Technologies Used

- **Frontend:** React, Redux
- **Backend:** Node.js
- **Machine Learning:** TensorFlow.js
- **Testing:** Jest, Testing Library
- **Build Tools:** Webpack

## Chinese Marketplace Research

### Platform Analysis

#### Initial Technical Findings

DHGATE:

- React-based frontend architecture
- Multi-tier discount system ($5 off every $50)
- New user benefits program (up to 90% off)
- IP Protection Portal
- Buyer Protection system
- Flash Deals feature
- Local Warehouse options
- Category-specific pricing (items as low as $1.90)
- Integrated influencer program
- Navigation timeout constraints (7000ms)
- Certificate validation issues present

ALIEXPRESS:

- Advanced image search capability (drag & drop + CTRL+V support)
- Tiered coupon system ($15 off $129+, $30 off $239+)
- Fast delivery options (8-day-avg on Choice items)
- Promotional events system (Gift Season, up to 60% off)
- Push notification system for order updates and deals
- Cross-origin security measures (CORS, script blocking)
- Bot protection (AWSC/baxia security system)
- Navigation timeout constraints (7000ms)

TEMU:

- Strong rate limiting and bot protection
- Multiple authentication methods (Google, Facebook, Apple, Phone)
- Free shipping & 90-day returns policy
- Encrypted data transmission
- Login required for browsing
- Multiple SDK integrations (Google, Facebook, Apple)
- Mobile-first approach evident from UI

#### Key Technical Considerations:

- Need to handle rate limiting
- Authentication bypass or user session management required
- Multiple platform SDK handling needed
- Mobile responsive design crucial

### Research Queries

#### Research Query 1: Market Share and User Base

TO RESEARCH:

- Monthly active users for each platform
- Global market share
- Growth trends
- Primary markets
- User demographics
- Average order value
- Most popular categories

#### Research Query 2: Common User Pain Points

TO RESEARCH:

- Review authenticity issues
- Shipping delays
- Hidden fees
- Quality inconsistency
- Communication barriers
- Return process difficulties
- Payment security concerns

#### Research Query 3: Existing Solutions

TO RESEARCH:

- Current browser extensions
- Mobile apps
- Web services
- Price comparison tools
- Review analyzers

#### Research Query 4: Technical Implementation

TO RESEARCH:

- API availability
- Web scraping policies
- Rate limiting
- Data structure differences
- Authentication requirements
- Cross-platform compatibility

#### Research Query 5: Monetization Potential

TO RESEARCH:

- Affiliate programs
- Commission structures
- Premium feature opportunities
- B2B possibilities
- Enterprise solutions

### Vetted AI Analysis

#### Search & Analysis Process

1. **Multi-Step Analysis Pipeline**

   - Progressive analysis stages with visual feedback
   - Each step clearly labeled and tracked
   - Parallel processing of different aspects
   - Real-time status updates for each stage

2. **Category-Based Analysis Structure**
   Dynamic analysis tailored to product category. Examples:

   Science Toys Analysis:

   - Reviewing Top-Rated Products
   - Analyzing Top Brands
   - Comparing by Age Group
   - Evaluating Educational Value/STEM Focus
   - Assessing Safety and Durability
   - Summarizing Findings

   Yoga Mats Analysis:

   - Reviewing Top-Rated Products
   - Analyzing Top Brands
   - Comparing Different Materials
   - Evaluating Thickness and Cushioning
   - Assessing Grip and Stickiness
   - Summarizing Findings

   Desk Lamps Analysis:

   - Reviewing Top-Rated Products
   - Analyzing Top Brands
   - Comparing Light Technologies (LED, Incandescent, Fluorescent)
   - Evaluating Brightness and Color Temperature
   - Assessing Additional Features (Dimming, USB Ports)
   - Summarizing Findings

   Key Observations:

   - Analysis structure adapts to category
   - Maintains consistent workflow pattern
   - Focuses on category-specific attributes
   - Progressive disclosure of findings
   - Real-time analysis indicators
   - Clear step completion markers

3. **Hierarchical Information Processing**

   - Sequential yet parallel analysis
   - Each step builds on previous findings
   - Comprehensive category understanding
   - Structured data presentation

4. **Results Integration**

   - Price comparison across retailers
   - Product variant matching
   - Visual verification with images
   - Retailer credibility assessment
   - Option comparison (colors, sizes, etc.)

5. **User Experience & Technical Features**
   - Clean, focused interface
   - Progressive information loading
   - Real-time multi-platform scanning
   - Natural language processing
   - Follow-up question capability

Adaptation Opportunities:

- Apply similar AI analysis to Chinese marketplace content
- Extend review analysis to include Chinese language reviews
- Add cross-cultural context and translation
- Implement marketplace-specific trust metrics

### Additional Chinese Marketplaces to Include

1. **Pinduoduo (拼多多)**

   - Group buying model
   - Direct factory connections
   - Agricultural products focus
   - Mobile-first approach

2. **Taobao (淘宝)**

   - Largest Chinese C2C platform
   - Extensive product range
   - Strong social commerce features
   - Domestic focus

3. **1688.com**

   - Alibaba's wholesale platform
   - B2B focused
   - Direct factory sourcing
   - Bulk purchasing options

4. **JD.com (京东)**

   - Known for authenticity
   - Strong logistics network
   - Electronics focus
   - Quality control measures

5. **Banggood**

   - International focus
   - DIY/Maker products
   - Direct shipping worldwide
   - Multiple warehouses

6. **LightInTheBox**

   - Wedding/Fashion focus
   - Customization options
   - Global shipping
   - Multi-language support

7. **Global Sources**
   - B2B platform
   - Trade show integration
   - Verified suppliers
   - Quality inspection services

### Enhanced Extension Features (Vetted AI-Inspired):

1. **AI-Powered Research Assistant**

   - Real-time product analysis across all Chinese marketplaces
   - Sentiment analysis of reviews (both English and Chinese)
   - Social proof aggregation (Reddit, YouTube, social media)
   - Quality prediction based on historical data
   - Factory/supplier reputation tracking
   - Cross-reference with B2B platforms (1688.com, Global Sources)

2. **Smart Price Intelligence**

   - Cross-platform price comparison (10+ marketplaces)
   - Group buying opportunities (Pinduoduo model)
   - Bulk purchase discounts (B2B vs B2C)
   - Hidden fee calculator (shipping, customs, taxes)
   - Historical price tracking
   - Currency conversion with rate trends
   - MOQ optimization suggestions

3. **Trust & Authentication System**

   - Cross-platform seller verification
   - Factory direct verification (via 1688.com)
   - Quality control metrics
   - Return rate analysis
   - Customer service response metrics
   - Payment security level indicators
   - Shipping reliability score
   - Warehouse location optimizer

4. **Cultural Bridge Features**

   - Automatic translation of:
     - Product details
     - Reviews
     - Seller communications
     - Size charts
   - Cultural context explanations
   - Holiday/promotion calendar
   - Regional pricing differences
   - Local market insights

5. **Smart Shopping Tools**

   - Image search across all platforms
   - Similar product finder
   - Quality-to-price ratio calculator
   - Delivery time estimator
   - Customs probability checker
   - Stock level tracker
   - Restock predictions

6. **Business Intelligence**

   - Profit margin calculator
   - Competitor price tracker
   - Trending products analyzer
   - Category demand forecaster
   - Seasonal trend predictor
   - Supplier relationship manager
   - Market gap identifier

7. **Technical Requirements**
   - Multi-platform API integration
   - Rate limiting management
   - Authentication handling
   - Data synchronization
   - Real-time price updates
   - Image recognition system
   - Machine learning models for:
     - Price prediction
     - Quality assessment
     - Trend analysis
     - Fraud detection

### Monetization Strategy

1. **Freemium Model**

   - Basic Features (Free):
     - Simple price comparison
     - Basic translation
     - Limited daily searches
     - Basic seller verification
   - Premium Features ($9.99/month):
     - AI-powered product analysis
     - Unlimited searches
     - Advanced price tracking
     - Full translation services
     - Complete seller verification
     - Business intelligence tools

2. **Business Plans**

   - Reseller Plan ($29.99/month):
     - Bulk product research
     - Profit margin calculator
     - Competitor analysis
     - Trending product alerts
     - Supplier relationship tools
   - Enterprise Plan ($99.99/month):
     - API access
     - Custom integrations
     - Dedicated support
     - White-label options
     - Advanced analytics

3. **Affiliate Revenue**

   - Commission from marketplaces
   - Referral fees from verified suppliers
   - Shipping partner commissions
   - Insurance referrals
   - Payment processor partnerships

4. **Data Monetization (Opt-in)**
   - Market trend reports
   - Price intelligence reports
   - Supplier performance metrics
   - Consumer behavior analytics
   - Category demand forecasts

### Implementation Priority Matrix

1. **Phase 1 (MVP - Month 1)**

   - Basic price comparison
   - Simple translation
   - Basic seller verification
   - Platform integration (Top 3)

2. **Phase 2 (Month 2-3)**

   - AI review analysis
   - Advanced price tracking
   - Image search
   - Additional platforms

3. **Phase 3 (Month 4-5)**

   - Business intelligence
   - Advanced translation
   - Custom integrations
   - API development

4. **Phase 4 (Month 6+)**
   - Machine learning models
   - Advanced analytics
   - White-label solutions
   - Enterprise features

### Next Steps:

1. Create MVP architecture
2. Develop core AI models
3. Establish marketplace partnerships
4. Build initial user base
5. Gather feedback and iterate

## MarketSage Protect Feature Assessment

### Overview

The MarketSage Protect feature is designed to analyze and assess the risk associated with product listings using machine learning models. It consists of three main components: `ScamDetectionModel`, `SecurityAnalyzer`, and `SmartRiskAssessment`.

### Findings

1. **Model Loading**: Both `ScamDetectionModel` and `SmartRiskAssessment` classes load TensorFlow.js models asynchronously, which is efficient.
2. **Risk Assessment Logic**: The `SecurityAnalyzer` class effectively combines multiple risk assessments to calculate an overall risk score.
3. **Placeholders**: There are placeholders for model paths and preprocessing logic that need to be addressed for full functionality.

### Recommendations

1. **Update Model Paths**: Ensure that the model paths in both `aiDetector.ts` and `smartRiskAssessment.ts` point to the actual model files.
2. **Implement Preprocessing Logic**: Develop the preprocessing logic in both classes to format input data correctly for the models.
3. **Testing**: Create unit tests for these classes to validate their functionality and ensure robustness.

### Conclusion

The MarketSage Protect feature is well-structured but requires some enhancements to fully realize its potential. Addressing the identified gaps will improve its effectiveness and reliability.

## MarketSage Protect Performance Evaluation

### Overview

This document summarizes the performance evaluation of the MarketSage Protect feature, focusing on the effectiveness of the risk assessment components.

### Performance Findings

1. **Model Path**: The model path in both `aiDetector.ts` and `smartRiskAssessment.ts` needs to be updated to point to the actual model file.
2. **Preprocessing Logic**: The preprocessing logic is currently a placeholder and requires implementation to ensure that input data is correctly formatted for the model.
3. **Testing**: Unit tests should be created to validate the functionality of the `ScamDetectionModel`, `SecurityAnalyzer`, and `SmartRiskAssessment` classes.

### Recommendations for Updates

1. **Update Model Paths**: Ensure that the model paths are correctly set in the respective files.
2. **Implement Preprocessing Logic**: Develop the preprocessing logic to format input data appropriately.
3. **Create Unit Tests**: Implement unit tests for the classes to ensure their functionality and robustness.

### Conclusion

The MarketSage Protect feature is well-structured but requires updates to enhance its performance and reliability.
