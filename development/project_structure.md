# MarketSage Project Structure

## Directory Structure
```
marketsage/
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   ├── services/
│   │   │   ├── insight/
│   │   │   │   ├── priceAnalysis.ts
│   │   │   │   └── marketTrends.ts
│   │   │   ├── protect/
│   │   │   │   ├── scamDetection.ts
│   │   │   │   └── riskAnalysis.ts
│   │   │   ├── scout/
│   │   │   │   ├── productSearch.ts
│   │   │   │   └── categoryMapping.ts
│   │   │   └── platformIntegration.ts
│   │   └── utils/
│   │       ├── storage.ts
│   │       └── api.ts
│   ├── content/
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── insight/
│   │   │   │   ├── PriceOverlay.tsx
│   │   │   │   └── TrendIndicator.tsx
│   │   │   ├── protect/
│   │   │   │   ├── WarningBadge.tsx
│   │   │   │   └── SecurityAlert.tsx
│   │   │   └── scout/
│   │   │       ├── SearchResults.tsx
│   │   │       └── ProductMatcher.tsx
│   │   └── platforms/
│   │       ├── temu.ts
│   │       ├── aliexpress.ts
│   │       └── dhgate.ts
│   ├── popup/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── insight/
│   │       │   ├── PriceAnalysis.tsx
│   │       │   └── MarketTrends.tsx
│   │       ├── protect/
│   │       │   ├── SecurityStatus.tsx
│   │       │   └── RiskMetrics.tsx
│   │       └── scout/
│   │           ├── Search.tsx
│   │           └── Recommendations.tsx
│   └── common/
│       ├── types/
│       │   ├── product.ts
│       │   ├── platform.ts
│       │   └── analysis.ts
│       └── utils/
│           ├── price.ts
│           ├── storage.ts
│           └── validation.ts
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── styles/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── config/
    ├── webpack.common.js
    ├── webpack.dev.js
    └── webpack.prod.js
```

## Core Configuration Files

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "MarketSage",
  "version": "1.0.0",
  "description": "Your Intelligent Marketplace Guide - Smart shopping assistant for Chinese marketplaces",
  "permissions": [
    "storage",
    "activeTab",
    "webRequest",
    "notifications"
  ],
  "host_permissions": [
    "*://*.temu.com/*",
    "*://*.aliexpress.com/*",
    "*://*.dhgate.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.temu.com/*",
        "*://*.aliexpress.com/*",
        "*://*.dhgate.com/*"
      ],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

### package.json
```json
{
  "name": "marketsage",
  "version": "1.0.0",
  "scripts": {
    "dev": "webpack --config config/webpack.dev.js --watch",
    "build": "webpack --config config/webpack.prod.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "cypress run",
    "lint": "eslint src/**/*.{ts,tsx}",
    "format": "prettier --write src/**/*.{ts,tsx}"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "redux": "^4.2.0",
    "react-redux": "^8.0.5",
    "@reduxjs/toolkit": "^1.9.0",
    "axios": "^1.3.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "typescript": "^4.9.0",
    "webpack": "^5.75.0",
    "webpack-cli": "^5.0.0",
    "webpack-merge": "^5.8.0",
    "@types/react": "^18.0.0",
    "@types/chrome": "^0.0.200",
    "jest": "^29.0.0",
    "cypress": "^12.0.0",
    "eslint": "^8.0.0",
    "prettier": "^2.8.0"
  }
}
```

## Initial Type Definitions

### src/common/types/product.ts
```typescript
export interface Product {
  id: string;
  title: string;
  price: {
    current: number;
    original?: number;
    currency: string;
  };
  seller: {
    id: string;
    name: string;
    rating?: number;
    totalSales?: number;
  };
  platform: Platform;
  url: string;
  images: string[];
  specifications?: Record<string, string>;
  shipping?: {
    cost: number;
    method: string;
    estimatedDays: number;
  };
}

export interface MarketSageAnalysis {
  protect: {
    riskScore: number;
    warnings: Warning[];
    sellerTrust: number;
  };
  insight: {
    priceAnalysis: PriceAnalysis;
    marketTrends: TrendAnalysis;
  };
  scout: {
    relevanceScore: number;
    alternatives: Product[];
  };
}
```

## Setup Steps

1. **Initialize Project**
```bash
mkdir marketsage
cd marketsage
npm init -y
```

2. **Install Dependencies**
```bash
npm install react react-dom redux react-redux @reduxjs/toolkit axios lodash
npm install -D typescript webpack webpack-cli webpack-merge @types/react @types/chrome jest cypress eslint prettier
```

3. **Create Directory Structure**
```bash
mkdir -p src/{background,content,popup,common}/{components,services,utils,types}
mkdir -p src/content/components/{insight,protect,scout}
mkdir -p public/{icons,styles}
mkdir -p tests/{unit,integration,e2e}
mkdir config
```

4. **Initialize Git**
```bash
git init
echo "node_modules/\ndist/\nbuild/" > .gitignore
git add .
git commit -m "Initial MarketSage project setup"
```

## Next Steps

1. Create webpack configurations
2. Set up ESLint and Prettier
3. Initialize test environment
4. Create core feature components
5. Set up CI/CD pipeline
