import { Product, Seller, Price, Platform } from '../../../src/common/types';

const chrome = {
  storage: {
    local: {
      data: {} as Record<string, any>, // Define data as a Record to avoid implicit any errors
      set: jest.fn((items: Record<string, any>, callback?: () => void) => {
        Object.assign(chrome.storage.local.data, items);
        if (callback) callback();
      }),
      get: jest.fn((keys: string | string[], callback: (result: Record<string, any>) => void) => {
        const result: Record<string, any> = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = chrome.storage.local.data[key];
          });
        } else {
          result[keys] = chrome.storage.local.data[keys];
        }
        if (callback) callback(result);
      }),
      clear: jest.fn((callback?: () => void) => {
        chrome.storage.local.data = {};
        if (callback) callback();
      }),
      remove: jest.fn((keys: string | string[], callback?: () => void) => {
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            delete chrome.storage.local.data[key];
          });
        } else {
          delete chrome.storage.local.data[keys];
        }
        if (callback) callback();
      }),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  tabs: {
    query: jest.fn((queryInfo, callback) => {
      callback([]); // Mocking an empty array for tabs
    }),
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
  },
  bookmarks: {
    create: jest.fn(),
    remove: jest.fn(),
  },
  history: {
    addUrl: jest.fn(),
  },
  // Add other necessary properties to mock the Chrome API
  browserAction: {},
  browsingData: {},
  commands: {},
  contentSettings: {},
  contextMenus: {},
  cookies: {},
  debugger: {},
  declarativeContent: {},
  // Add any other properties that are required by the tests
  cast: {},
  accessibilityFeatures: {},
  action: {},
  browser: {},
};

global.chrome = chrome as any;

export {};

// Test data generators. These existed in this module historically and were
// removed in a later commit while suites still imported them
// (securityAnalyzer.test.ts, ProtectSection.test.tsx) — restored against
// the current common/types shapes.
export const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: 'test-product-1',
  title: 'Test Product',
  description: 'A test product description',
  price: {
    current: 29.99,
    original: 39.99,
    currency: 'USD'
  },
  images: ['image1.jpg', 'image2.jpg'],
  seller: {
    id: 'seller-1',
    name: 'Test Seller',
    rating: 4.5,
    totalSales: 1000
  },
  platform: Platform.TEMU,
  url: 'https://www.temu.com/test-product',
  ...overrides
});

export const createMockSeller = (overrides?: Partial<Seller>): Seller => ({
  id: 'seller-1',
  name: 'Test Seller',
  rating: 4.5,
  totalSales: 1000,
  ...overrides
});

export const createMockPrice = (overrides?: Partial<Price>): Price => ({
  current: 29.99,
  original: 39.99,
  currency: 'USD',
  ...overrides
});

// DOM test utilities
export const createMockElement = (innerHTML: string): HTMLElement => {
  const div = document.createElement('div');
  div.innerHTML = innerHTML;
  return div;
};
