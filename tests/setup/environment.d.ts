type MockFn = jest.Mock & {
  mockImplementation: (fn: (...args: any[]) => any) => MockFn;
  mockImplementationOnce: (fn: (...args: any[]) => any) => MockFn;
  mockReturnValue: (value: any) => MockFn;
  mockResolvedValue: (value: any) => MockFn;
  mockRejectedValue: (value: any) => MockFn;
  mockReset: () => void;
  getMockName: () => string;
  mock: {
    calls: any[][];
    results: any[];
    instances: any[];
  };
};

interface ChromeMock {
  runtime: {
    sendMessage: MockFn;
    onMessage: {
      addListener: MockFn;
      removeListener: MockFn;
    };
  };
  tabs: {
    query: MockFn;
    sendMessage: MockFn;
    create: MockFn;
    update: MockFn;
  };
  storage: {
    local: {
      get: MockFn;
      set: MockFn;
      remove: MockFn;
      clear: MockFn;
    };
  };
  scripting: {
    executeScript: MockFn;
  };
  action: {
    setBadgeText: MockFn;
    setBadgeBackgroundColor: MockFn;
  };
}

declare global {
  namespace NodeJS {
    interface Global {
      chrome: ChromeMock;
    }
  }

  var chrome: ChromeMock;
}

export {};
