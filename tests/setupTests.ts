// Add any global test setup here
import '@testing-library/jest-dom';

// Mock Storage
jest.mock('../src/common/utils/storage', () => {
  const mockStorage = {
    getUserScamPreferences: jest.fn(),
    setUserScamPreferences: jest.fn(),
    getSellerRating: jest.fn(),
    getPriceHistory: jest.fn(),
    getProductCache: jest.fn(),
    saveUnifiedCart: jest.fn(),
    getUnifiedCart: jest.fn(),
    saveCheckoutSession: jest.fn(),
    getCheckoutSession: jest.fn(),
    getCurrentUser: jest.fn(),
    getCategories: jest.fn(),
    getProductsByCategory: jest.fn(),
    clearAll: jest.fn()
  };
  
  return {
    Storage: mockStorage
  };
});

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
