# MarketSage

Your Intelligent Marketplace Guide - A smart shopping assistant for Chinese marketplaces.

## Overview

MarketSage is an intelligent browser extension that enhances the shopping experience on Chinese marketplaces. It provides smart features for product discovery, price comparison, and secure shopping across platforms like AliExpress, DHGate, and Temu.

## Key Features

- **MarketSage Protect**: Advanced security features for safe shopping
- **MarketSage Insight**: Intelligent price comparison and analysis
- **MarketSage Scout**: Smart product discovery and recommendations

## Project Structure

```
src/
├── background/    # Background script components and services
├── common/        # Shared utilities and types
├── content/       # Content script features
└── popup/         # Extension popup interface
```

## Development

### Prerequisites

- Node.js
- npm/yarn
- TypeScript

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Load the extension in your browser

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/unit/services
```

## Contributing

Contributions are welcome! Please read our contributing guidelines for details on our code of conduct and development process.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
