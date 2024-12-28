import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, Store } from '@reduxjs/toolkit';
import { rootReducer, RootState } from '../../../src/popup/store/rootReducer';

// Create a custom render function that includes Redux Provider
interface ExtendedRenderOptions {
  preloadedState?: Partial<RootState>;
  store?: Store;
  renderOptions?: Omit<Parameters<typeof render>[1], 'wrapper'>;
}

interface ExtendedRenderResult extends RenderResult {
  store: Store;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: rootReducer,
      preloadedState
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
): ExtendedRenderResult {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  } as ExtendedRenderResult;
}

// Mock component props
export interface MockComponentProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

// Create a basic mock component
export const createMockComponent = (displayName: string): React.FC<MockComponentProps> => {
  const MockComponent: React.FC<MockComponentProps> = ({ 
    children, 
    ...props 
  }) => (
    <div data-testid={`mock-${displayName.toLowerCase()}`} {...props}>
      {children}
    </div>
  );
  MockComponent.displayName = displayName;
  return MockComponent;
};

// Mock Intersection Observer
interface IntersectionObserverMockProps {
  root?: Element | null;
  rootMargin?: string;
  thresholds?: number[];
  disconnect?: () => void;
  observe?: (target: Element) => void;
  unobserve?: (target: Element) => void;
  takeRecords?: () => IntersectionObserverEntry[];
}

export const setupIntersectionObserverMock = ({
  root = null,
  rootMargin = '',
  thresholds = [],
  disconnect = () => null,
  observe = () => null,
  unobserve = () => null,
  takeRecords = () => []
}: IntersectionObserverMockProps = {}): void => {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = root;
    readonly rootMargin: string = rootMargin;
    readonly thresholds: ReadonlyArray<number> = thresholds;
    disconnect: () => void = disconnect;
    observe: (target: Element) => void = observe;
    unobserve: (target: Element) => void = unobserve;
    takeRecords: () => IntersectionObserverEntry[] = takeRecords;
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver
  });
};

// Mock ResizeObserver
export const setupResizeObserverMock = (): void => {
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
};

// Setup all browser mocks
export const setupBrowserMocks = (): void => {
  setupIntersectionObserverMock();
  setupResizeObserverMock();
  setupMatchMediaMock();
};

// Mock window.matchMedia
export const setupMatchMediaMock = (): void => {
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
};

// Create a mock Redux store state
export const createMockStoreState = (overrides: Partial<RootState> = {}): Partial<RootState> => ({
  products: {},
  sellers: {},
  priceHistory: {},
  settings: {
    notifications: true,
    autoAnalyze: true
  },
  ui: {
    theme: 'light',
    loading: false,
    error: null
  },
  ...overrides
});

// Helper to wait for component updates
export const waitForComponentToPaint = async (wrapper: any): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 0));
  if (wrapper.update) {
    wrapper.update();
  }
};
