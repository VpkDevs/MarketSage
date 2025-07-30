import { PriceExtractor } from '../../../src/content/services/priceExtractor';
import { PlatformDetector, Platform } from '../../../src/content/services/platformDetector';
import { ErrorHandler } from '../../../src/common/errors/ErrorHandler';

// Mock dependencies
jest.mock('../../../src/content/services/platformDetector');
jest.mock('../../../src/common/errors/ErrorHandler');

describe('PriceExtractor', () => {
  let priceExtractor: PriceExtractor;
  let mockPlatformDetector: jest.Mocked<PlatformDetector>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup document mock
    document.body.innerHTML = '';
    
    // Setup mocks
    mockPlatformDetector = {
      isSupported: jest.fn().mockReturnValue(true),
      getCurrentPlatform: jest.fn().mockReturnValue(Platform.TEMU),
      getSelector: jest.fn().mockReturnValue('.price'),
      detectPlatform: jest.fn(),
      getConfig: jest.fn(),
      validateUrl: jest.fn(),
      isSupportedUrl: jest.fn()
    } as unknown as jest.Mocked<PlatformDetector>;
    
    mockErrorHandler = {
      handleError: jest.fn(),
      error: jest.fn(),
      addReporter: jest.fn(),
      getErrorMetrics: jest.fn()
    } as unknown as jest.Mocked<ErrorHandler>;
    
    // Mock constructor
    (PlatformDetector as jest.Mock).mockImplementation(() => mockPlatformDetector);
    (ErrorHandler.getInstance as jest.Mock).mockReturnValue(mockErrorHandler);
    
    // Create instance
    priceExtractor = new PriceExtractor();
  });

  it('should return default price when platform is not supported', async () => {
    // Setup
    mockPlatformDetector.isSupported.mockReturnValue(false);
    
    // Execute
    const result = await priceExtractor.extract();
    
    // Verify
    expect(result).toEqual({
      current: 0,
      currency: 'USD',
      original: undefined,
      discount: undefined
    });
  });

  it('should extract current price correctly', async () => {
    // Setup
    document.body.innerHTML = `
      <div class="price">$99.99</div>
    `;
    
    // Execute
    const result = await priceExtractor.extract();
    
    // Verify
    expect(result.current).toBeCloseTo(99.99);
    expect(result.currency).toBe('USD');
  });

  it('should extract original price and calculate discount', async () => {
    // Setup
    document.body.innerHTML = `
      <div class="price">$79.99</div>
      <div class="original-price">$99.99</div>
    `;
    
    // Execute
    const result = await priceExtractor.extract();
    
    // Verify
    expect(result.current).toBeCloseTo(79.99);
    expect(result.original).toBeCloseTo(99.99);
    expect(result.discount).toBeCloseTo(20);
  });

  it('should handle missing price elements gracefully', async () => {
    // Setup
    document.body.innerHTML = ''; // No price elements
    
    // Execute
    const result = await priceExtractor.extract();
    
    // Verify
    expect(result).toEqual({
      current: 0,
      currency: 'USD',
      original: undefined,
      discount: undefined
    });
    expect(mockErrorHandler.error).toHaveBeenCalled();
  });

  it('should detect currency from price text', async () => {
    // Setup
    document.body.innerHTML = `
      <div class="price">€79.99</div>
    `;
    
    // Execute
    const result = await priceExtractor.extract();
    
    // Verify
    expect(result.current).toBeCloseTo(79.99);
    expect(result.currency).toBe('EUR');
  });

  it('should use platform default currency when no symbol is found', async () => {
    // Setup
    document.body.innerHTML = `
      <div class="price">79.99</div>
    `;
    mockPlatformDetector.getCurrentPlatform.mockReturnValue(Platform.ALIEXPRESS);
    
    // Execute
    const result = await priceExtractor.extract();
    
    // Verify
    expect(result.current).toBeCloseTo(79.99);
    expect(result.currency).toBe('USD');
  });

  it('should handle exceptions during extraction', async () => {
    // Setup
    document.body.innerHTML = `
      <div class="price">$79.99</div>
    `;
    
    // Force an error
    mockPlatformDetector.getSelector.mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Execute
    const result = await priceExtractor.extract();
    
    // Verify
    expect(result).toEqual({
      current: 0,
      currency: 'USD',
      original: undefined,
      discount: undefined
    });
    expect(mockErrorHandler.error).toHaveBeenCalled();
  });
});