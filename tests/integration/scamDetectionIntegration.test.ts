import { ScamDetectionModel } from '../../src/common/models/scamDetectionModel';
import { ScamDetectionPreferences } from '../../src/common/models/scamDetection/userPreferences';
import { Storage } from '../../src/common/utils/storage';

// This is an integration test that tests how user preferences affect scam detection results

// Mock the Storage
jest.mock('../../src/common/utils/storage');

// Mock the detection engines with simplified implementations
jest.mock('../../src/common/models/scamDetection/anomalyDetection', () => {
  return {
    AnomalyDetectionEngine: jest.fn().mockImplementation(() => {
      return {
        detectAnomalies: jest.fn().mockImplementation((product) => {
          // Simple implementation that returns high score for low prices
          const priceRatio = product.price / (product.marketPrice || product.price * 2);
          const score = priceRatio < 0.5 ? 0.8 : 0.2;
          
          return Promise.resolve({
            score,
            anomalies: score > 0.5 ? 
              [{ description: `Price is suspiciously low (${Math.round(priceRatio * 100)}% of market price)` }] : 
              []
          });
        })
      };
    })
  };
});

// Simplified mocks for other engines
jest.mock('../../src/common/models/scamDetection/imageAnalysis', () => ({
  ImageAnalysisEngine: jest.fn().mockImplementation(() => ({
    analyzeProductImages: jest.fn().mockResolvedValue({ score: 0.3, issues: [] })
  }))
}));

jest.mock('../../src/common/models/scamDetection/sellerAnalysis', () => ({
  SellerAnalysisEngine: jest.fn().mockImplementation(() => ({
    analyzeSeller: jest.fn().mockResolvedValue({ score: 0.2, reasons: [] })
  }))
}));

jest.mock('../../src/common/models/scamDetection/crossPlatformVerifier', () => ({
  CrossPlatformVerifier: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockResolvedValue({ score: 0.1, issues: [] })
  }))
}));

jest.mock('../../src/common/models/scamDetection/reviewAnalyzer', () => ({
  ReviewAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeReviews: jest.fn().mockResolvedValue({ score: 0.2, issues: [] })
  }))
}));

describe('Scam Detection Integration', () => {
  let model: ScamDetectionModel;
  let preferences: ScamDetectionPreferences;
  
  beforeEach(() => {
    jest.clearAllMocks();
    model = new ScamDetectionModel();
    preferences = ScamDetectionPreferences.getInstance();
  });
  
  test('user preferences affect detection results', async () => {
    // Create a test product with suspicious price
    const testProduct = {
      title: 'Test Product',
      description: 'This is a test product',
      price: 19.99,
      marketPrice: 99.99, // 80% discount
      userId: 'test-user'
    };
    
    // First test with default preferences
    // Mock getUserPreferences to return default preferences
    (preferences.getUserPreferences as jest.Mock).mockResolvedValue({
      userId: 'test-user',
      heuristics: [
        {
          id: 'price_anomaly',
          name: 'Price Anomaly Detection',
          enabled: true,
          weight: 0.8,
          configOptions: {}
        },
        {
          id: 'image_quality_analysis',
          name: 'Image Quality Analysis',
          enabled: true,
          weight: 0.6,
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
      globalThreshold: 70
    });
    
    // Analyze with default preferences
    const defaultResult = await model.analyze(testProduct);
    
    // Now test with modified preferences
    // Mock getUserPreferences to return modified preferences
    (preferences.getUserPreferences as jest.Mock).mockResolvedValue({
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
          id: 'image_quality_analysis',
          name: 'Image Quality Analysis',
          enabled: true,
          weight: 0.6,
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
      globalThreshold: 70
    });
    
    // Analyze with modified preferences
    const modifiedResult = await model.analyze(testProduct);
    
    // The modified result should have a lower risk score since we disabled price anomaly detection
    expect(modifiedResult.probability).toBeLessThan(defaultResult.probability);
    
    // The default result should include price anomaly as a risk factor
    expect(defaultResult.riskFactors.some(factor => factor.includes('Price is suspiciously low'))).toBe(true);
    
    // The modified result should not include price anomaly as a risk factor
    expect(modifiedResult.riskFactors.some(factor => factor.includes('Price is suspiciously low'))).toBe(false);
  });
  
  test('global threshold affects detection sensitivity', async () => {
    // Create a test product with moderately suspicious price
    const testProduct = {
      title: 'Test Product',
      description: 'This is a test product',
      price: 39.99,
      marketPrice: 59.99, // 33% discount
      userId: 'test-user'
    };
    
    // Test with low threshold (less sensitive)
    (preferences.getUserPreferences as jest.Mock).mockResolvedValue({
      userId: 'test-user',
      heuristics: [
        {
          id: 'price_anomaly',
          name: 'Price Anomaly Detection',
          enabled: true,
          weight: 0.8,
          configOptions: {}
        }
      ],
      globalThreshold: 50 // Low threshold
    });
    
    // Analyze with low threshold
    const lowThresholdResult = await model.analyze(testProduct);
    
    // Test with high threshold (more sensitive)
    (preferences.getUserPreferences as jest.Mock).mockResolvedValue({
      userId: 'test-user',
      heuristics: [
        {
          id: 'price_anomaly',
          name: 'Price Anomaly Detection',
          enabled: true,
          weight: 0.8,
          configOptions: {}
        }
      ],
      globalThreshold: 90 // High threshold
    });
    
    // Analyze with high threshold
    const highThresholdResult = await model.analyze(testProduct);
    
    // The high threshold result should have a higher risk score
    expect(highThresholdResult.probability).toBeGreaterThan(lowThresholdResult.probability);
    
    // The risk levels might be different
    expect(highThresholdResult.overallRiskLevel).not.toBe(lowThresholdResult.overallRiskLevel);
  });
});
