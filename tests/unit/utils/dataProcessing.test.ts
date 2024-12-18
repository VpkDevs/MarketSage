import { DataProcessing } from '../../../src/common/utils/dataProcessing';

describe('DataProcessing', () => {
  describe('normalizePrice', () => {
    it('should format price with currency and 2 decimal places', () => {
      expect(DataProcessing.normalizePrice(10.5, 'USD')).toBe('USD 10.50');
      expect(DataProcessing.normalizePrice(99.99, 'EUR')).toBe('EUR 99.99');
      expect(DataProcessing.normalizePrice(0, 'GBP')).toBe('GBP 0.00');
    });
  });

  describe('normalizeTitle', () => {
    it('should trim and normalize whitespace', () => {
      expect(DataProcessing.normalizeTitle('  Product   Title  ')).toBe('Product Title');
      expect(DataProcessing.normalizeTitle('\nProduct\t\tTitle\n')).toBe('Product Title');
      expect(DataProcessing.normalizeTitle('')).toBe('');
    });
  });

  describe('extractNumericPrice', () => {
    it('should extract numeric price from string', () => {
      expect(DataProcessing.extractNumericPrice('$10.50')).toBe(10.50);
      expect(DataProcessing.extractNumericPrice('€99,99')).toBe(99.99);
      expect(DataProcessing.extractNumericPrice('Price: £15.75')).toBe(15.75);
      expect(DataProcessing.extractNumericPrice('No price')).toBe(0);
    });

    it('should handle thousand separators', () => {
      expect(DataProcessing.extractNumericPrice('$1,234.56')).toBe(1234.56);
      expect(DataProcessing.extractNumericPrice('€1.234,56')).toBe(1234.56);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate correct discount percentage', () => {
      expect(DataProcessing.calculateDiscount(100, 80)).toBe(20);
      expect(DataProcessing.calculateDiscount(50, 25)).toBe(50);
      expect(DataProcessing.calculateDiscount(200, 150)).toBe(25);
    });

    it('should handle edge cases', () => {
      expect(DataProcessing.calculateDiscount(0, 0)).toBe(0);
      expect(DataProcessing.calculateDiscount(100, 0)).toBe(100);
      expect(DataProcessing.calculateDiscount(100, 100)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(DataProcessing.calculateDiscount(100, 66.6)).toBe(33);
      expect(DataProcessing.calculateDiscount(100, 33.3)).toBe(67);
    });
  });

  describe('normalizeImages', () => {
    it('should trim and filter empty strings', () => {
      const input = ['  image1.jpg  ', '', '  image2.png  ', '   '];
      const expected = ['image1.jpg', 'image2.png'];
      expect(DataProcessing.normalizeImages(input)).toEqual(expected);
    });
  });

  describe('normalizeSpecifications', () => {
    it('should trim keys and values', () => {
      const input = {
        '  color  ': '  red  ',
        ' size ': '  large  '
      };
      const expected = {
        'color': 'red',
        'size': 'large'
      };
      expect(DataProcessing.normalizeSpecifications(input)).toEqual(expected);
    });
  });
});
