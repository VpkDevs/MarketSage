import { ScamDetectionModel } from '../../src/common/models/scamDetectionModel';
import { ScamDetectionPreferences } from '../../src/common/models/scamDetection/userPreferences';

// Mock the detection engines
jest.mock('../../src/common/models/scamDetection/anomalyDetection', () => {
  return {
    AnomalyDetectionEngine: jest.fn().mockImplementation(() => {
      return {
        detectAnomalies: jest.fn().mockResolvedValue({
          score: 0.7,
          anomalies: [
            { description: 'Price is suspiciously low for this category (3.2 std. dev. below average)' }
          ]
        })
      };
    })
  };
});

jest.mock('../../src/common/models/scamDetection/imageAnalysis', () => {
  return {
    ImageAnalysisEngine: jest.fn().mockImplementation(() => {
      return {
        analyzeProductImages: jest.fn().mockResolvedValue({
          score: 0.3,
          issues: [
            { description: 'Image 1 has unusually low quality' }
          ]
        })
      };
    })
  };
});

jest.mock('../../src/common/models/scamDetection/sellerAnalysis', () => {
  return {
    SellerAnalysisEngine: jest.fn().mockImplementation(() => {
      return {
        analyzeSeller: jest.fn().mockResolvedValue({
          score: 0.5,
          reasons: [
            'New account (15 days old) with high listing volume (75 listings)'
          ]
        })
      };
    })
  };
});

jest.mock('../../src/common/models/scamDetection/crossPlatformVerifier', () => {
  return {
    CrossPlatformVerifier: jest.fn().mockImplementation(() => {
      return {
        verify: jest.fn().mockResolvedValue({
          score: 0.2,
          issues: []
        })
      };
    })
  };
});

jest.mock('../../src/common/models/scamDetection/reviewAnalyzer', () => {
  return {
    ReviewAnalyzer: jest.fn().mockImplementation(() => {
      return {
        analyzeReviews: jest.fn().mockResolvedValue({
          score: 0.8,
          issues: [
            'Unusual spike in 5-star reviews in the last 24 hours'
          ]
        })
      };
    })
  };
});

// Mock the preferences
jest.mock('../../src/common/models/scamDetection/userPreferences', () => {
  const originalModule = jest.requireActual('../../src/common/models/scamDetection/userPreferences');
  
  return {
    ...originalModule,
    ScamDetectionPreferences: {
      getInstance: jest.fn().mockReturnValue({
        getUserPreferences: jest.fn().mockResolvedValue({
          userId: 'test-user',
          heuristics: [
            {
              id: 'price_anomaly',
              name: 'Price Anomaly Detection',
              enabled: true,
              weight: 0.8,
              configOptions: { zScoreThreshold: 2.5 }
            },
            {
              id: 'image_quality_analysis',
              name: 'Image Quality Analysis',
              enabled: true,
              weight: 0.6,
              configOptions: { qualityThreshold: 0.4 }
            },
            {
              id: 'seller_history_analysis',
              name: 'Seller History Analysis',
              enabled: true,
              weight: 0.7,
              configOptions: {}
            },
            {
              id: 'review_pattern_analysis',
              name: 'Review Pattern Analysis',
              enabled: true,
              weight: 0.9,
              configOptions: {}
            },
            {
              id: 'cross_platform_verification',
              name: 'Cross-Platform Verification',
              enabled: false, // Disabled
              weight: 0.5,
              configOptions: {}
            }
          ],
          globalThreshold: 70
        })
      })
    }
  };
});

describe('ScamDetectionModel', () => {
  let model: ScamDetectionModel;
  
  beforeEach(() => {
    jest.clearAllMocks();
    model = new ScamDetectionModel();
  });
  
  test('should analyze product and return weighted risk assessment', async () => {
    // Sample product data
    const productData = {
      title: 'Test Product',
      description: 'This is a test product description',
      price: 19.99,
      marketPrice: 49.99,
      images: ['image1.jpg', 'image2.jpg'],
      sellerId: 'seller123',
      categoryId: 'electronics',
      userId: 'test-user'
    };
    
    // Analyze the product
    const result = await model.analyze(productData);
    
    // Verify the result structure
    expect(result).toHaveProperty('probability');
    expect(result).toHaveProperty('riskFactors');
    expect(result).toHaveProperty('detailedResults');
    expect(result).toHaveProperty('overallRiskLevel');
    
    // Verify detailed results include all enabled heuristics
    expect(result.detailedResults).toHaveLength(5); // 4 enabled + 1 disabled
    
    // Verify disabled heuristic has zero score
    const disabledResult = result.detailedResults.find(r => r.heuristicId === 'cross_platform_verification');
    expect(disabledResult?.enabled).toBe(false);
    expect(disabledResult?.score).toBe(0);
    
    // Verify risk factors include significant findings
    expect(result.riskFactors).toContain('Price is suspiciously low for this category (3.2 std. dev. below average)');
    expect(result.riskFactors).toContain('Unusual spike in 5-star reviews in the last 24 hours');
    
    // Verify risk level is appropriate for the calculated probability
    if (result.probability < 0.3) {
      expect(result.overallRiskLevel).toBe('LOW');
    } else if (result.probability < 0.6) {
      expect(result.overallRiskLevel).toBe('MEDIUM');
    } else if (result.probability < 0.8) {
      expect(result.overallRiskLevel).toBe('HIGH');
    } else {
      expect(result.overallRiskLevel).toBe('CRITICAL');
    }
  });
  
  test('should handle product with missing data', async () => {
    // Sample product with minimal data
    const minimalProduct = {
      title: 'Minimal Product',
      description: 'Minimal description',
      price: 29.99,
      userId: 'test-user'
    };
    
    // Analyze the product
    const result = await model.analyze(minimalProduct);
    
    // Verify the analysis still works with minimal data
    expect(result).toHaveProperty('probability');
    expect(result).toHaveProperty('riskFactors');
    expect(result).toHaveProperty('detailedResults');
    expect(result).toHaveProperty('overallRiskLevel');
  });
});
