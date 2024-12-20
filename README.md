# MarketSage

Your Intelligent Marketplace Guide - A smart shopping assistant for Chinese marketplaces.

## Overview

MarketSage is an intelligent browser extension that enhances your shopping experience on Chinese marketplaces through three powerful core features:

- **MarketSage Protect**: Advanced security features to protect you from scams and fraudulent listings
- **MarketSage Insight**: Intelligent price comparison and historical tracking
- **MarketSage Scout**: Smart product discovery and recommendations

## Key Features

### MarketSage Protect
- Real-time scam detection
- Seller verification
- Risk assessment
- Security alerts
- Fraud pattern detection

### MarketSage Insight
- Cross-platform price comparison
- Historical price tracking
- Deal alerts
- Value analysis
- Market trend insights

### MarketSage Scout
- Smart product discovery
- Intelligent search enhancement
- Cross-platform product matching
- Category optimization
- Personalized recommendations

## Supported Platforms
- AliExpress
- TEMU
- DHGate
- More platforms coming soon!

## Development

### Prerequisites
- Node.js
- npm/yarn
- TypeScript

### Setup
1. Clone the repository
```bash
git clone https://github.com/VpkDevs/MarketSage.git
```

2. Install dependencies
```bash
npm install
```

3. Build the project
```bash
npm run build
```

4. Load the extension in your browser
- Open Chrome/Edge
- Navigate to extensions page
- Enable developer mode
- Load unpacked extension from `dist` directory

### Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/unit/services
```

## Project Structure
```
src/
├── background/    # Extension background services
├── common/        # Shared utilities and types
├── content/       # Content script features
└── popup/         # Extension popup interface
```

## Contributing
Contributions are welcome! Please read our contributing guidelines for details on our code of conduct and development process.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
