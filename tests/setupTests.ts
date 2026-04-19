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
    clearAll: jest.fn(),
    // Temporal analyzer
    getTemporalSellerData: jest.fn().mockResolvedValue(null),
    saveTemporalSellerData: jest.fn().mockResolvedValue(undefined),
    // Cross-listing engine
    getCrossListingFingerprints: jest.fn().mockResolvedValue([]),
    saveCrossListingFingerprint: jest.fn().mockResolvedValue(undefined),
    // Image hash registry
    getImageHashRegistry: jest.fn().mockResolvedValue({}),
    saveImageHashEntry: jest.fn().mockResolvedValue(undefined),
    // Feedback engine
    getFeedbackEntries: jest.fn().mockResolvedValue([]),
    saveFeedbackEntry: jest.fn().mockResolvedValue(undefined),
    getFeedbackWeights: jest.fn().mockResolvedValue({}),
    saveFeedbackWeights: jest.fn().mockResolvedValue(undefined),
    // Threat intelligence
    getBlacklistedSellers: jest.fn().mockResolvedValue([]),
    getSuspiciousPatterns: jest.fn().mockResolvedValue([]),
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
