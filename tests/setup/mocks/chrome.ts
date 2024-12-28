const createMockFunction = () => jest.fn();

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
      get: createMockFunction(),
      set: createMockFunction(),
      remove: createMockFunction(),
      clear: createMockFunction()
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
