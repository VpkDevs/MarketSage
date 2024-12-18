/// <reference types="jest" />

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

// Assign the mock to the global object
Object.assign(globalThis, { chrome: mockChrome });

// Reset storage and mocks before each test
beforeEach(() => {
  Object.keys(storage).forEach(key => {
    delete storage[key];
  });
  jest.clearAllMocks();
});

export {};
