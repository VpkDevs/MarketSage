import { ScamDetectionPreferences, DEFAULT_HEURISTICS } from '../src/common/models/scamDetection/userPreferences';
import { ScamDetectionModel } from '../src/common/models/scamDetectionModel';
import { Platform } from '../src/common/types';

// Mock the Storage module
jest.mock('../src/common/utils/storage', () => {
  return {
    Storage: {
      getUserScamPreferences: jest.fn().mockResolvedValue(null),
      setUserScamPreferences: jest.fn().mockResolvedValue(undefined),
      getSellerRating: jest.fn().mockResolvedValue(null)
    }
  };
});

// Mock the detection engines
jest.mock('../src/common/models/scamDetection/anomalyDetection', () => {
  return {
    AnomalyDetectionEngine: jest.fn().mockImplementation(() => {
      return {
        detectAnomalies: jest.fn().mockImplementation((product) => {
          // Simple implementation that returns high score for low prices
          const priceRatio = product.price.current / (product.price.market || product.price.current * 2);
          const score = priceRatio < 0.5 ? 0.8 : 0.2;

          return Promise.resolve({
            score,
            anomalies: score > 0.5 ?
              [{ type: 'PRICE_ANOMALY', severity: 0.8, description: `Price is suspiciously low (${Math.round(priceRatio * 100)}% of market price)` }] :
              []
          });
        })
      };
    })
  };
});

// Simplified mocks for other engines
jest.mock('../src/common/models/scamDetection/imageAnalysis', () => ({
  ImageAnalysisEngine: jest.fn().mockImplementation(() => ({
    analyzeProductImages: jest.fn().mockResolvedValue({ score: 0.3, issues: [] })
  }))
}));

jest.mock('../src/common/models/scamDetection/sellerAnalysis', () => ({
  SellerAnalysisEngine: jest.fn().mockImplementation(() => ({
    analyzeSeller: jest.fn().mockImplementation((sellerId) => {
      if (sellerId === 'new-seller') {
        return Promise.resolve({
          score: 0.7,
          reasons: ['Seller account is very new with limited history']
        });
      }
      return Promise.resolve({ score: 0.2, reasons: [] });
    })
  }))
}));

jest.mock('../src/common/models/scamDetection/crossPlatformVerifier', () => ({
  CrossPlatformVerifier: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockResolvedValue({ score: 0.1, issues: [] })
  }))
}));

jest.mock('../src/common/models/scamDetection/reviewAnalyzer', () => ({
  ReviewAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeReviews: jest.fn().mockResolvedValue({ score: 0.2, issues: [] })
  }))
}));

describe('ScamDetectionPreferences', () => {
  let preferences: ScamDetectionPreferences;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Get the singleton instance
    preferences = ScamDetectionPreferences.getInstance();
  });

  test('should return default preferences for a new user', async () => {
    // Get preferences for a new user
    const userPrefs = await preferences.getUserPreferences('new-user');

    // Verify default preferences were returned
    expect(userPrefs.userId).toBe('new-user');
    expect(userPrefs.heuristics).toEqual(DEFAULT_HEURISTICS);
    expect(userPrefs.globalThreshold).toBe(70);
  });
});

describe('ScamDetectionModel', () => {
  let model: ScamDetectionModel;

  beforeEach(() => {
    jest.clearAllMocks();
    model = new ScamDetectionModel();
  });

  test('should analyze product and return risk assessment', async () => {
    // Sample product data with suspicious price
    const productData = {
      title: 'Test Product',
      description: 'This is a test product description',
      price: 19.99,
      marketPrice: 99.99, // 80% discount
      userId: 'test-user'
    };

    // Analyze the product
    const result = await model.analyze(productData);

    // Verify the result structure
    expect(result).toHaveProperty('probability');
    expect(result).toHaveProperty('riskFactors');
    expect(result).toHaveProperty('detailedResults');
    expect(result).toHaveProperty('overallRiskLevel');

    // Verify risk factors include price anomaly
    expect(result.riskFactors).toContain('Price is suspiciously low (20% of market price)');

    // Verify risk level is HIGH or CRITICAL due to the suspicious price
    expect(['HIGH', 'CRITICAL']).toContain(result.overallRiskLevel);
  });

  test('should analyze product with suspicious seller', async () => {
    // Sample product with suspicious seller
    const productData = {
      title: 'Test Product',
      description: 'This is a test product description',
      price: 49.99,
      marketPrice: 59.99, // Normal price
      sellerId: 'new-seller', // This will trigger the seller analysis mock
      userId: 'test-user'
    };

    // Analyze the product
    const result = await model.analyze(productData);

    // Verify risk factors include seller warning
    expect(result.riskFactors).toContain('Seller account is very new with limited history');
  });

  test('should respect user preferences when analyzing', async () => {
    // Mock getUserScamPreferences to return custom preferences
    const mockGetPreferences = require('../src/common/utils/storage').Storage.getUserScamPreferences;
    mockGetPreferences.mockResolvedValue({
      userId: 'test-user',
      heuristics: [
        {
          id: 'price_anomaly',
          name: 'Price Anomaly Detection',
          enabled: false, // Disabled
          weight: 0.8,
          configOptions: {}
        },
        {
          id: 'seller_history_analysis',
          name: 'Seller History Analysis',
          enabled: true,
          weight: 0.7,
          configOptions: {}
        }
      ],
      globalThreshold: 70,
      lastUpdated: Date.now()
    });

    // Sample product with suspicious price but normal seller
    const productData = {
      title: 'Test Product',
      description: 'This is a test product description',
      price: 19.99,
      marketPrice: 99.99, // 80% discount
      sellerId: 'normal-seller',
      userId: 'test-user'
    };

    // Analyze the product
    const result = await model.analyze(productData);

    // Verify price anomaly is not in risk factors because it's disabled
    expect(result.riskFactors).not.toContain('Price is suspiciously low (20% of market price)');

    // Verify the risk level is lower
    expect(['LOW', 'MEDIUM']).toContain(result.overallRiskLevel);
  });
});
