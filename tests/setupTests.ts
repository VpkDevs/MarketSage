// Global test setup.
//
// Installs the shared chrome API mock (tests/setup/mocks/chrome.ts), whose
// storage.local is a functional in-memory implementation, so suites can
// exercise the real Storage class and other chrome-backed code.
//
// NOTE: Storage must NOT be mocked globally here. A previous version of
// this file replaced src/common/utils/storage with a hand-maintained stub
// that drifted from the real class (missing methods, undefined returns),
// which made the Storage unit suite test the stub instead of the code.
// Suites that need Storage stubbed declare their own jest.mock locally.
import '@testing-library/jest-dom';
import './setup/mocks/chrome';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => {
  return {
    loadLayersModel: jest.fn().mockResolvedValue({
      predict: jest.fn().mockReturnValue({
        dataSync: jest.fn().mockReturnValue([0.5])
      })
    }),
    tensor2d: jest.fn().mockReturnValue({}),
    zeros: jest.fn().mockReturnValue({}),
    browser: {
      fromPixels: jest.fn().mockReturnValue({
        resizeBilinear: jest.fn().mockReturnValue({
          toFloat: jest.fn().mockReturnValue({
            div: jest.fn().mockReturnValue({
              expandDims: jest.fn().mockReturnValue({})
            })
          })
        })
      })
    },
    tidy: jest.fn().mockImplementation((fn) => fn())
  };
});
