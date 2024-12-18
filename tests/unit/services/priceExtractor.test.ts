import { PriceExtractor } from '../../../src/content/services/priceExtractor';
import { Platform } from '../../../src/common/types';

describe('PriceExtractor', () => {
  let priceExtractor: PriceExtractor;
  
  beforeEach(() => {
    // Clear the document body before each test
    document.body.innerHTML = '';
    priceExtractor = new PriceExtractor();
  });

  describe('TEMU platform', () => {
    beforeEach(() => {
      priceExtractor.setPlatform(Platform.TEMU);
      document.body.innerHTML = `
        <div>
          <span class="price-current">$99.99</span>
          <span class="price-original">$129.99</span>
        </div>
      `;
    });

    it('should extract current price', async () => {
      const price = await priceExtractor.extract();
      expect(price.current).toBe(99.99);
      expect(price.currency).toBe('USD');
    });

    it('should extract original price and calculate discount', async () => {
      const price = await priceExtractor.extract();
      expect(price.original).toBe(129.99);
      expect(price.discount).toBe(23); // 23% discount
    });
  });

  describe('AliExpress platform', () => {
    beforeEach(() => {
      priceExtractor.setPlatform(Platform.ALIEXPRESS);
      document.body.innerHTML = `
        <div>
          <span class="product-price-value">€89.99</span>
          <span class="product-price-original">€119.99</span>
        </div>
      `;
    });

    it('should extract current price', async () => {
      const price = await priceExtractor.extract();
      expect(price.current).toBe(89.99);
      expect(price.currency).toBe('EUR');
    });

    it('should extract original price and calculate discount', async () => {
      const price = await priceExtractor.extract();
      expect(price.original).toBe(119.99);
      expect(price.discount).toBe(25); // 25% discount
    });
  });

  describe('DHGate platform', () => {
    beforeEach(() => {
      priceExtractor.setPlatform(Platform.DHGATE);
      document.body.innerHTML = `
        <div>
          <span class="price-now">£75.99</span>
          <span class="price-was">£99.99</span>
        </div>
      `;
    });

    it('should extract current price', async () => {
      const price = await priceExtractor.extract();
      expect(price.current).toBe(75.99);
      expect(price.currency).toBe('GBP');
    });

    it('should extract original price and calculate discount', async () => {
      const price = await priceExtractor.extract();
      expect(price.original).toBe(99.99);
      expect(price.discount).toBe(24); // 24% discount
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      priceExtractor.setPlatform(Platform.TEMU);
    });

    it('should handle missing price elements', async () => {
      document.body.innerHTML = '<div></div>';
      const price = await priceExtractor.extract();
      expect(price.current).toBe(0);
      expect(price.original).toBeUndefined();
      expect(price.discount).toBeUndefined();
    });

    it('should handle malformed price text', async () => {
      document.body.innerHTML = `
        <div>
          <span class="price-current">Invalid</span>
          <span class="price-original">Price</span>
        </div>
      `;
      const price = await priceExtractor.extract();
      expect(price.current).toBe(0);
      expect(price.original).toBeUndefined();
      expect(price.discount).toBeUndefined();
    });

    it('should handle prices with thousand separators', async () => {
      document.body.innerHTML = `
        <div>
          <span class="price-current">$1,299.99</span>
          <span class="price-original">$1,499.99</span>
        </div>
      `;
      const price = await priceExtractor.extract();
      expect(price.current).toBe(1299.99);
      expect(price.original).toBe(1499.99);
      expect(price.discount).toBe(13); // 13% discount
    });
  });

  describe('Currency detection', () => {
    it('should default to USD when no currency symbol is found', async () => {
      priceExtractor.setPlatform(Platform.TEMU);
      document.body.innerHTML = `
        <div>
          <span class="price-current">99.99</span>
        </div>
      `;
      const price = await priceExtractor.extract();
      expect(price.currency).toBe('USD');
    });

    it('should detect different currency symbols', async () => {
      const testCases = [
        { symbol: '$', expected: 'USD' },
        { symbol: '€', expected: 'EUR' },
        { symbol: '£', expected: 'GBP' },
        { symbol: '¥', expected: 'CNY' }
      ];

      for (const { symbol, expected } of testCases) {
        document.body.innerHTML = `
          <div>
            <span class="price-current">${symbol}99.99</span>
          </div>
        `;
        const price = await priceExtractor.extract();
        expect(price.currency).toBe(expected);
      }
    });
  });
});
