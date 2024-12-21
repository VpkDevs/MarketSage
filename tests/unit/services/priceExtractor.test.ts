import { PriceExtractor } from '../../../src/content/services/priceExtractor';
import { Platform, PlatformConfig } from '../../../src/common/types';
import { PlatformDetector } from '../../../src/content/services/platformDetector';

// Mock PlatformDetector methods
jest.spyOn(PlatformDetector.prototype, 'isSupported').mockImplementation(
  () => !window.location.hostname.includes('unsupported')
);

jest.spyOn(PlatformDetector.prototype, 'getCurrentPlatform').mockImplementation(() => {
  if (window.location.hostname.includes('aliexpress')) {
    return Platform.ALIEXPRESS;
  } else if (window.location.hostname.includes('dhgate')) {
    return Platform.DHGATE;
  } else if (window.location.hostname.includes('temu')) {
    return Platform.TEMU;
  }
  return Platform.UNKNOWN;
});

jest.spyOn(PlatformDetector.prototype, 'getSelector').mockImplementation(() => {
  if (window.location.hostname.includes('aliexpress')) {
    return '.product-price-value';
  } else if (window.location.hostname.includes('dhgate')) {
    return '.price-now';
  }
  return '.product-price';
});

describe('PriceExtractor', () => {
  let extractor: PriceExtractor;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = new URL('https://www.temu.com/product') as any;
    
    // Reset DOM
    document.body.innerHTML = '';
    
    extractor = new PriceExtractor();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('extract', () => {
    it('should extract price information from TEMU', async () => {
      window.location = new URL('https://www.temu.com/product') as any;
      document.body.innerHTML = `
        <div class="product-price">$29.99</div>
        <div class="original-price">$39.99</div>
      `;

      const price = await extractor.extract();

      expect(price.current).toBe(29.99);
      expect(price.original).toBe(39.99);
      expect(price.currency).toBe('USD');
      expect(price.discount).toBe(25); // (39.99 - 29.99) / 39.99 * 100 = 25
    });

    it('should extract price information from AliExpress', async () => {
      window.location = new URL('https://www.aliexpress.com/item') as any;
      document.body.innerHTML = `
        <div class="product-price-value">€24.99</div>
        <div class="product-price-original">€34.99</div>
      `;

      const price = await extractor.extract();

      expect(price.current).toBe(24.99);
      expect(price.original).toBe(34.99);
      expect(price.currency).toBe('EUR');
      expect(price.discount).toBe(29); // (34.99 - 24.99) / 34.99 * 100 ≈ 29
    });

    it('should extract price information from DHGate', async () => {
      window.location = new URL('https://www.dhgate.com/product') as any;
      document.body.innerHTML = `
        <div class="price-now">£19.99</div>
        <div class="price-was">£29.99</div>
      `;

      const price = await extractor.extract();

      expect(price.current).toBe(19.99);
      expect(price.original).toBe(29.99);
      expect(price.currency).toBe('GBP');
      expect(price.discount).toBe(33); // (29.99 - 19.99) / 29.99 * 100 ≈ 33
    });

    it('should handle missing original price', async () => {
      document.body.innerHTML = `
        <div class="product-price">$29.99</div>
      `;

      const price = await extractor.extract();

      expect(price.current).toBe(29.99);
      expect(price.original).toBeUndefined();
      expect(price.discount).toBeUndefined();
    });

    it('should handle missing price elements', async () => {
      document.body.innerHTML = '<div></div>';

      const price = await extractor.extract();

      expect(price.current).toBe(0);
      expect(price.original).toBeUndefined();
      expect(price.discount).toBeUndefined();
    });

    it('should handle unsupported platforms', async () => {
      window.location = new URL('https://www.unsupported.com/product') as any;
      extractor = new PriceExtractor();

      const price = await extractor.extract();

      expect(price.current).toBe(0);
      expect(price.currency).toBe('USD');
      expect(price.original).toBeUndefined();
      expect(price.discount).toBeUndefined();
    });
  });

  describe('currency detection', () => {
    it('should detect EUR from € symbol', async () => {
      document.body.innerHTML = `
        <div class="product-price">€29.99</div>
      `;

      const price = await extractor.extract();
      expect(price.currency).toBe('EUR');
    });

    it('should detect GBP from £ symbol', async () => {
      document.body.innerHTML = `
        <div class="product-price">£29.99</div>
      `;

      const price = await extractor.extract();
      expect(price.currency).toBe('GBP');
    });

    it('should detect CNY from ¥ symbol', async () => {
      document.body.innerHTML = `
        <div class="product-price">¥199.99</div>
      `;

      const price = await extractor.extract();
      expect(price.currency).toBe('CNY');
    });

    it('should use platform default currency when no symbol is present', async () => {
      window.location = new URL('https://www.aliexpress.com/item') as any;
      document.body.innerHTML = `
        <div class="product-price-value">29.99</div>
      `;

      const price = await extractor.extract();
      expect(price.currency).toBe('EUR');
    });
  });

  describe('price formatting', () => {
    it('should handle European number format', async () => {
      document.body.innerHTML = `
        <div class="product-price">29,99 €</div>
      `;

      const price = await extractor.extract();
      expect(price.current).toBe(29.99);
    });

    it('should handle prices with thousand separators', async () => {
      document.body.innerHTML = `
        <div class="product-price">1,299.99 €</div>
      `;

      const price = await extractor.extract();
      expect(price.current).toBe(1299.99);
    });

    it('should handle European prices with thousand separators', async () => {
      document.body.innerHTML = `
        <div class="product-price">1.299,99 €</div>
      `;

      const price = await extractor.extract();
      expect(price.current).toBe(1299.99);
    });
  });
});
