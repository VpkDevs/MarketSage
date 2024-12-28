import '@testing-library/jest-dom';
import { mockChrome, resetChromeMocks } from './setup/mocks/chrome';

// Setup global mocks
Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

// Mock URL and Location
class MockURL {
  href: string;
  constructor(url: string) {
    this.href = url;
  }
}

Object.defineProperty(global, 'URL', {
  value: MockURL,
  writable: true
});

// Reset before each test
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  resetChromeMocks();

  // Reset document body
  document.body.innerHTML = '';

  // Reset window location
  delete (window as any).location;
  window.location = new URL('http://localhost') as any;
});

// Add custom matchers
expect.extend({
  toHaveBeenCalledWithMatch(received: jest.Mock, ...expected: any[]) {
    const pass = received.mock.calls.some(call =>
      expected.every((arg, index) =>
        typeof arg === 'object'
          ? expect.objectContaining(arg).asymmetricMatch(call[index])
          : arg === call[index]
      )
    );

    return {
      pass,
      message: () =>
        `expected ${received.getMockName()} to have been called with arguments matching ${expected.join(
          ', '
        )}`,
    };
  },
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithMatch(...args: any[]): R;
    }
  }
}

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
