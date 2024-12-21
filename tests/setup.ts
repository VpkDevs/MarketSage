/// <reference types="jest" />

// Mock storage
const storage: { [key: string]: any } = {};

const mockChrome = {
  storage: {
    local: {
      get: jest.fn((keys: any, callback?: any) => {
        const result: { [key: string]: any } = {};
        
        if (keys === null) {
          Object.assign(result, storage);
        } else if (typeof keys === 'string') {
          result[keys] = storage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = storage[key];
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            result[key] = storage[key] ?? keys[key];
          });
        }

        if (callback) {
          callback(result);
          return;
        }
        return Promise.resolve(result);
      }),

      set: jest.fn((items: { [key: string]: any }, callback?: () => void) => {
        Object.assign(storage, items);
        if (callback) {
          callback();
          return;
        }
        return Promise.resolve();
      }),

      remove: jest.fn((keys: string | string[], callback?: () => void) => {
        const keysToRemove = typeof keys === 'string' ? [keys] : keys;
        keysToRemove.forEach(key => {
          delete storage[key];
        });
        if (callback) {
          callback();
          return;
        }
        return Promise.resolve();
      }),

      clear: jest.fn((callback?: () => void) => {
        Object.keys(storage).forEach(key => {
          delete storage[key];
        });
        if (callback) {
          callback();
          return;
        }
        return Promise.resolve();
      })
    }
  }
};

// Mock URL and Location
class MockURL {
  href: string;
  constructor(url: string) {
    this.href = url;
  }
}

// Setup global mocks
Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

Object.defineProperty(global, 'URL', {
  value: MockURL,
  writable: true
});

// Reset before each test
beforeEach(() => {
  // Clear storage
  Object.keys(storage).forEach(key => {
    delete storage[key];
  });

  // Reset all mocks
  jest.clearAllMocks();

  // Reset document body
  document.body.innerHTML = '';

  // Reset window location
  delete (window as any).location;
  window.location = new URL('http://localhost') as any;
});

export {};
