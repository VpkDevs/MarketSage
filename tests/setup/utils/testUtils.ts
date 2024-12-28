import { Product, Seller, Price, Platform } from '../../../src/common/types';

// Chrome storage types
type StorageCallback = (items: { [key: string]: any }) => void;
type StorageData = { [key: string]: any };

// Test data generators
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

export const setupProductPage = (platform: Platform = Platform.TEMU): void => {
  document.body.innerHTML = `
    <div class="product-container">
      <h1 class="product-title">Test Product</h1>
      <div class="product-price">$29.99</div>
      <div class="original-price">$39.99</div>
      <div class="seller-info">
        <span class="seller-name">Test Seller</span>
        <span class="seller-rating">4.5</span>
      </div>
      <div class="product-description">
        A test product description
      </div>
      <div class="product-images">
        <img src="image1.jpg" />
        <img src="image2.jpg" />
      </div>
    </div>
  `;
};

// Chrome message helpers
export const createChromeMessage = (type: string, data: any = {}) => ({
  type,
  data
});

// Storage test utilities
export const mockStorageData: StorageData = {
  products: {},
  sellers: {},
  priceHistory: {},
  settings: {
    notifications: true,
    autoAnalyze: true
  }
};

export const setupMockStorage = (data: StorageData = mockStorageData): void => {
  const mockGet = (
    keys: string | string[] | StorageData | null,
    callback?: StorageCallback
  ): Promise<StorageData> | void => {
    if (callback) {
      callback(data);
      return;
    }
    return Promise.resolve(data);
  };

  // Cast chrome.storage.local.get to any to allow mock implementation
  (chrome.storage.local.get as any) = jest.fn().mockImplementation(mockGet);
};

// React test utilities
export const createTestProps = <T extends object>(props: T): T => ({
  ...props
});

// Async test helpers
export const waitForAsync = (): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, 0));

export const mockFetch = (data: any): void => {
  (global as any).fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data)
    })
  );
};
