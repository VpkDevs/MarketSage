# Project Structure & Initialization

## Directory Structure
```
chinese-marketplace-extension/
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   ├── services/
│   │   │   ├── priceAnalysis.ts
│   │   │   ├── scamDetection.ts
│   │   │   ├── searchService.ts
│   │   │   └── platformIntegration.ts
│   │   └── utils/
│   │       ├── storage.ts
│   │       └── api.ts
│   ├── content/
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── PriceOverlay.tsx
│   │   │   ├── WarningBadge.tsx
│   │   │   ├── SellerInfo.tsx
│   │   │   └── SearchResults.tsx
│   │   └── platforms/
│   │       ├── temu.ts
│   │       ├── aliexpress.ts
│   │       └── dhgate.ts
│   ├── popup/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── Search.tsx
│   │       ├── Analysis.tsx
│   │       └── Settings.tsx
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
  "name": "Chinese Marketplace Helper",
  "version": "1.0.0",
  "description": "Smart shopping assistant for Chinese marketplaces",
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
  "name": "chinese-marketplace-helper",
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

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "dist"]
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

export interface ProductAnalysis {
  riskScore: number;
  warnings: Warning[];
  priceAnalysis: PriceAnalysis;
  sellerAnalysis: SellerAnalysis;
}
```

### src/common/types/platform.ts
```typescript
export enum Platform {
  TEMU = 'temu',
  ALIEXPRESS = 'aliexpress',
  DHGATE = 'dhgate'
}

export interface PlatformConfig {
  name: Platform;
  baseUrl: string;
  selectors: {
    price: string;
    title: string;
    seller: string;
    shipping: string;
  };
  apiEndpoints?: {
    search?: string;
    product?: string;
    seller?: string;
  };
}
```

## Setup Steps

1. **Initialize Project**
```bash
mkdir chinese-marketplace-extension
cd chinese-marketplace-extension
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
mkdir -p public/{icons,styles}
mkdir -p tests/{unit,integration,e2e}
mkdir config
```

4. **Initialize Git**
```bash
git init
echo "node_modules/\ndist/\nbuild/" > .gitignore
git add .
git commit -m "Initial project setup"
```

## Next Steps

1. Create webpack configurations
2. Set up ESLint and Prettier
3. Initialize test environment
4. Create basic component structure
5. Set up CI/CD pipeline
