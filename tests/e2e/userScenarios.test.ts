import { UnifiedBrowserManager } from '../../src/common/models/unifiedClient/UnifiedBrowserManager';
import { ScamDetectionPreferences } from '../../src/common/models/scamDetection/userPreferences';
import { Storage } from '../../src/common/utils/storage';
import { Platform } from '../../src/common/types';

// Mock the Storage
jest.mock('../../src/common/utils/storage');

// Mock the ScamDetectionModel
jest.mock('../../src/common/models/scamDetectionModel', () => {
  return {
    ScamDetectionModel: jest.fn().mockImplementation(() => {
      return {
        analyze: jest.fn().mockImplementation((data) => {
          // Simple implementation that returns high risk for low prices
          const priceRatio = data.price / (data.marketPrice || data.price * 2);
          const probability = priceRatio < 0.5 ? 0.8 : 0.2;
          
          let overallRiskLevel = 'LOW';
          if (probability > 0.7) overallRiskLevel = 'CRITICAL';
          else if (probability > 0.6) overallRiskLevel = 'HIGH';
          else if (probability > 0.3) overallRiskLevel = 'MEDIUM';
          
          return Promise.resolve({
            probability,
            riskFactors: probability > 0.5 ? ['Price is suspiciously low'] : [],
            detailedResults: [],
            overallRiskLevel
          });
        })
      };
    })
  };
});

// Mock UserPreferences
jest.mock('../../src/common/models/userPreferences', () => {
  return {
    UserPreferences: {
      getInstance: jest.fn().mockReturnValue({
        getScamDetectionPreferences: jest.fn().mockResolvedValue({
          criticalAction: 'hide',
          highAction: 'warn',
          mediumAction: 'highlight',
          lowAction: 'none',
          hideProductsCompletely: false
        })
      })
    }
  };
});

describe('End-to-End User Scenarios', () => {
  let browserManager: UnifiedBrowserManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    browserManager = UnifiedBrowserManager.getInstance();
    
    // Mock fetchFromPlatform to return test products
    (browserManager as any).fetchFromPlatform = jest.fn().mockImplementation((platform, query, filters) => {
      // Return different products based on platform
      if (platform === Platform.ALIEXPRESS) {
        return Promise.resolve([
          {
            id: 'ali1',
            title: 'AliExpress Normal Product',
            description: 'A normal product with regular pricing',
            price: { current: 49.99, original: 59.99, currency: 'USD' },
            market: 50.00,
            platform: Platform.ALIEXPRESS,
            seller: { id: 'seller1', rating: 4.8 },
            images: ['image1.jpg', 'image2.jpg']
          },
          {
            id: 'ali2',
            title: 'AliExpress Suspicious Product',
            description: 'A product with suspiciously low pricing',
            price: { current: 9.99, original: 99.99, currency: 'USD' },
            market: 95.00,
            platform: Platform.ALIEXPRESS,
            seller: { id: 'seller2', rating: 4.9 },
            images: ['image3.jpg', 'image4.jpg']
          }
        ]);
      } else if (platform === Platform.TEMU) {
        return Promise.resolve([
          {
            id: 'temu1',
            title: 'Temu Normal Product',
            description: 'A normal product with regular pricing',
            price: { current: 29.99, original: 34.99, currency: 'USD' },
            market: 32.00,
            platform: Platform.TEMU,
            seller: { id: 'seller3', rating: 4.7 },
            images: ['image5.jpg', 'image6.jpg']
          }
        ]);
      } else {
        return Promise.resolve([]);
      }
    });
  });
  
  test('Scenario: User searches for products and sees scam warnings', async () => {
    // User searches for products
    const searchResult = await browserManager.browseProducts(
      'test product',
      { minPrice: 0, maxPrice: 100 },
      'test-user'
    );
    
    // Verify search results
    expect(searchResult.products).toHaveLength(3); // 2 from AliExpress, 1 from Temu
    expect(searchResult.totalFound).toBe(3);
    
    // Verify suspicious product is marked appropriately
    const suspiciousProduct = searchResult.products.find(p => p.id === 'ali2');
    expect(suspiciousProduct).toBeDefined();
    expect(suspiciousProduct?.hidden).toBe(true); // Should be hidden based on critical risk
    
    // Verify normal products are not marked
    const normalProduct1 = searchResult.products.find(p => p.id === 'ali1');
    const normalProduct2 = searchResult.products.find(p => p.id === 'temu1');
    expect(normalProduct1?.hidden).toBeFalsy();
    expect(normalProduct2?.hidden).toBeFalsy();
    expect(normalProduct1?.displayWarning).toBeFalsy();
    expect(normalProduct2?.displayWarning).toBeFalsy();
  });
  
  test('Scenario: User changes preferences and sees different warnings', async () => {
    // First, mock user preferences to show warnings instead of hiding
    (browserManager as any).userPreferences.getScamDetectionPreferences = jest.fn().mockResolvedValue({
      criticalAction: 'warn', // Changed from 'hide' to 'warn'
      highAction: 'highlight',
      mediumAction: 'notify',
      lowAction: 'none',
      hideProductsCompletely: false
    });
    
    // User searches for products with new preferences
    const searchResult = await browserManager.browseProducts(
      'test product',
      { minPrice: 0, maxPrice: 100 },
      'test-user'
    );
    
    // Verify suspicious product is now warned instead of hidden
    const suspiciousProduct = searchResult.products.find(p => p.id === 'ali2');
    expect(suspiciousProduct).toBeDefined();
    expect(suspiciousProduct?.hidden).toBeFalsy(); // Should not be hidden
    expect(suspiciousProduct?.displayWarning).toBe(true); // Should show warning
    
    // Verify normal products are still not marked
    const normalProduct1 = searchResult.products.find(p => p.id === 'ali1');
    const normalProduct2 = searchResult.products.find(p => p.id === 'temu1');
    expect(normalProduct1?.displayWarning).toBeFalsy();
    expect(normalProduct2?.displayWarning).toBeFalsy();
  });
  
  test('Scenario: User adds products to cart and proceeds to checkout', async () => {
    // Mock getUnifiedCart to return empty cart initially
    (Storage.getUnifiedCart as jest.Mock).mockResolvedValue([]);
    
    // User adds a product to cart
    await browserManager.addToUnifiedCart(
      {
        id: 'temu1',
        title: 'Temu Normal Product',
        description: 'A normal product with regular pricing',
        price: { current: 29.99, original: 34.99, currency: 'USD' },
        platform: Platform.TEMU,
        seller: { id: 'seller3', rating: 4.7 },
        images: ['image5.jpg', 'image6.jpg'],
        url: 'https://temu.com/product/temu1'
      },
      2 // Quantity
    );
    
    // Verify product was added to cart
    expect(Storage.saveUnifiedCart).toHaveBeenCalled();
    const savedCart = (Storage.saveUnifiedCart as jest.Mock).mock.calls[0][0];
    expect(savedCart).toHaveLength(1);
    expect(savedCart[0].productId).toBe('temu1');
    expect(savedCart[0].quantity).toBe(2);
    
    // User proceeds to checkout
    const checkoutSession = await browserManager.proceedToCheckout();
    
    // Verify checkout session was created
    expect(Storage.saveCheckoutSession).toHaveBeenCalled();
    expect(checkoutSession.platforms).toHaveLength(1);
    expect(checkoutSession.platforms[0].platform).toBe(Platform.TEMU);
    expect(checkoutSession.platforms[0].items).toHaveLength(1);
    expect(checkoutSession.platforms[0].status).toBe('pending');
    expect(checkoutSession.status).toBe('started');
  });
});
