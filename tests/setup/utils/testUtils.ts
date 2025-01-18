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

global.chrome = chrome;

export {};
