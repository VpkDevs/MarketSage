import { SecurityAnalyzer } from '../../../src/background/services/protect/securityAnalyzer';
import { Storage } from '../../../src/common/utils/storage';
import { createMockProduct } from '../../setup/utils/testUtils';
import { Platform } from '../../../src/common/types';

// Mock the Storage class
jest.mock('../../../src/common/utils/storage');

describe('SecurityAnalyzer', () => {
  let analyzer: SecurityAnalyzer;
  
  beforeEach(() => {
    analyzer = new SecurityAnalyzer();
    jest.clearAllMocks();
  });

  describe('analyzeProduct', () => {
    it('should return security metrics for a product', async () => {
      // Arrange
      const mockProduct = createMockProduct({
        id: 'test-product',
        price: { current: 29.99, original: 39.99, currency: 'USD' },
        seller: { id: 'test-seller', name: 'Test Seller', rating: 4.5, totalSales: 1000 },
        platform: Platform.TEMU
      });

      // Mock storage responses
      (Storage.getSellerRating as jest.Mock).mockResolvedValue(4.5);
      (Storage.getPriceHistory as jest.Mock).mockResolvedValue([
        { current: 29.99, timestamp: Date.now() }
      ]);
      (Storage.getProductCache as jest.Mock).mockResolvedValue({
        'test-product': mockProduct
      });

      // Act
      const result = await analyzer.analyzeProduct(mockProduct);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        riskScore: expect.any(Number),
        warnings: expect.any(Array),
        sellerTrust: expect.any(Number)
      }));

      // Verify the score is within valid range (0-100)
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      
      // Verify seller trust is within valid range (0-100)
      expect(result.sellerTrust).toBeGreaterThanOrEqual(0);
      expect(result.sellerTrust).toBeLessThanOrEqual(100);
    });

    it('should generate appropriate warnings for risky products', async () => {
      // Arrange
      const mockProduct = createMockProduct({
        description: '', // Empty description should trigger a warning
        images: [], // No images should trigger a warning
        seller: { id: 'new-seller', name: 'New Seller', rating: 0, totalSales: 0 }
      });

      (Storage.getSellerRating as jest.Mock).mockResolvedValue(null); // New seller
      (Storage.getPriceHistory as jest.Mock).mockResolvedValue([
        { current: 59.99, timestamp: Date.now() - 86400000 } // Previous price
      ]);

      // Act
      const result = await analyzer.analyzeProduct(mockProduct);

      // Assert
      expect(result.warnings).toContain('Limited product description');
      expect(result.warnings).toContain('No product images available');
      expect(result.warnings).toContain('New seller with no rating history');
    });

    it('should detect price anomalies', async () => {
      // Arrange
      const mockProduct = createMockProduct({
        price: { current: 9.99, original: 39.99, currency: 'USD' }
      });

      (Storage.getSellerRating as jest.Mock).mockResolvedValue(4.5);
      (Storage.getPriceHistory as jest.Mock).mockResolvedValue([
        { current: 39.99, timestamp: Date.now() - 86400000 },
        { current: 39.99, timestamp: Date.now() - 172800000 },
        { current: 39.99, timestamp: Date.now() - 259200000 }
      ]);

      // Act
      const result = await analyzer.analyzeProduct(mockProduct);

      // Assert
      expect(result.warnings).toContain('Price is suspiciously low compared to history');
      expect(result.riskScore).toBeGreaterThan(50); // Higher risk score for suspicious price
    });

    it('should handle missing data gracefully', async () => {
      // Arrange
      const mockProduct = createMockProduct();
      
      (Storage.getSellerRating as jest.Mock).mockResolvedValue(null);
      (Storage.getPriceHistory as jest.Mock).mockResolvedValue([]);
      (Storage.getProductCache as jest.Mock).mockResolvedValue({});

      // Act
      const result = await analyzer.analyzeProduct(mockProduct);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        riskScore: expect.any(Number),
        warnings: expect.any(Array),
        sellerTrust: expect.any(Number)
      }));
    });
  });
});
