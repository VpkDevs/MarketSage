const createMockFunction = () => jest.fn();

// Functional in-memory chrome.storage.local: the real Storage class and
// other chrome-backed code under test await these methods (promise style)
// and some call sites use the callback style, so both are supported.
const store = new Map<string, any>();

const storageGet = jest.fn((keys?: any, callback?: (result: any) => void) => {
  const result: Record<string, any> = {};
  if (keys === null || keys === undefined) {
    for (const [key, value] of store.entries()) result[key] = value;
  } else if (typeof keys === 'string') {
    if (store.has(keys)) result[keys] = store.get(keys);
  } else if (Array.isArray(keys)) {
    for (const key of keys) if (store.has(key)) result[key] = store.get(key);
  } else if (typeof keys === 'object') {
    for (const [key, defaultValue] of Object.entries(keys)) {
      result[key] = store.has(key) ? store.get(key) : defaultValue;
    }
  }
  if (callback) callback(result);
  return Promise.resolve(result);
});

const storageSet = jest.fn((items: Record<string, any>, callback?: () => void) => {
  for (const [key, value] of Object.entries(items)) store.set(key, value);
  if (callback) callback();
  return Promise.resolve();
});

const storageRemove = jest.fn((keys: string | string[], callback?: () => void) => {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) store.delete(key);
  if (callback) callback();
  return Promise.resolve();
});

const storageClear = jest.fn((callback?: () => void) => {
  store.clear();
  if (callback) callback();
  return Promise.resolve();
});

export const mockChrome = {
  runtime: {
    sendMessage: createMockFunction(),
    onMessage: {
      addListener: createMockFunction(),
      removeListener: createMockFunction()
    }
  },
  tabs: {
    query: createMockFunction(),
    sendMessage: createMockFunction(),
    create: createMockFunction(),
    update: createMockFunction()
  },
  storage: {
    local: {
      get: storageGet,
      set: storageSet,
      remove: storageRemove,
      clear: storageClear
    }
  },
  scripting: {
    executeScript: createMockFunction()
  },
  action: {
    setBadgeText: createMockFunction(),
    setBadgeBackgroundColor: createMockFunction()
  }
} as const;

// Reset all mock implementations
export const resetChromeMocks = () => {
  const resetMock = (mock: jest.Mock) => {
    mock.mockReset();
  };

  Object.values(mockChrome).forEach(api => {
    if (typeof api === 'object') {
      Object.values(api).forEach(method => {
        if (typeof method === 'function') {
          resetMock(method as jest.Mock);
        } else if (typeof method === 'object') {
          Object.values(method).forEach(subMethod => {
            if (typeof subMethod === 'function') {
              resetMock(subMethod as jest.Mock);
            }
          });
        }
      });
    }
  });
};

// Setup global chrome object
Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});
