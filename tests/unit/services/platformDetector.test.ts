import { PlatformDetector } from '../../../src/content/services/platformDetector';
import { Platform } from '../../../src/common/types';

describe('PlatformDetector', () => {
  let detector: PlatformDetector;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = new URL('https://example.com') as any;
    detector = new PlatformDetector();
  });

  describe('detectPlatform', () => {
    it('should detect TEMU platform', () => {
      window.location = new URL('https://www.temu.com/product') as any;
      detector = new PlatformDetector();
      expect(detector.getCurrentPlatform()).toBe(Platform.TEMU);
    });

    it('should detect AliExpress platform', () => {
      window.location = new URL('https://www.aliexpress.com/item') as any;
      detector = new PlatformDetector();
      expect(detector.getCurrentPlatform()).toBe(Platform.ALIEXPRESS);
    });

    it('should detect DHGate platform', () => {
      window.location = new URL('https://www.dhgate.com/product') as any;
      detector = new PlatformDetector();
      expect(detector.getCurrentPlatform()).toBe(Platform.DHGATE);
    });

    it('should return UNKNOWN for unsupported platforms', () => {
      window.location = new URL('https://www.unsupported.com') as any;
      detector = new PlatformDetector();
      expect(detector.getCurrentPlatform()).toBe(Platform.UNKNOWN);
    });
  });

  describe('getConfig', () => {
    it('should return correct selectors for TEMU', () => {
      window.location = new URL('https://www.temu.com/product') as any;
      detector = new PlatformDetector();
      const config = detector.getConfig();
      expect(config.name).toBe(Platform.TEMU);
      expect(config.selectors.price).toBe('.product-price, .actual-price');
    });

    it('should return correct selectors for AliExpress', () => {
      window.location = new URL('https://www.aliexpress.com/item') as any;
      detector = new PlatformDetector();
      const config = detector.getConfig();
      expect(config.name).toBe(Platform.ALIEXPRESS);
      expect(config.selectors.price).toBe('.product-price-value');
    });

    it('should return correct selectors for DHGate', () => {
      window.location = new URL('https://www.dhgate.com/product') as any;
      detector = new PlatformDetector();
      const config = detector.getConfig();
      expect(config.name).toBe(Platform.DHGATE);
      expect(config.selectors.price).toBe('.price-now');
    });
  });

  describe('getSelector', () => {
    it('should return correct selector for specific type', () => {
      window.location = new URL('https://www.temu.com/product') as any;
      detector = new PlatformDetector();
      expect(detector.getSelector('price')).toBe('.product-price, .actual-price');
      expect(detector.getSelector('title')).toBe('.product-title, .item-title');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported platforms', () => {
      window.location = new URL('https://www.temu.com/product') as any;
      detector = new PlatformDetector();
      expect(detector.isSupported()).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      window.location = new URL('https://www.unsupported.com') as any;
      detector = new PlatformDetector();
      expect(detector.isSupported()).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate supported platform URLs', () => {
      expect(detector.validateUrl('https://www.temu.com/product')).toBe(true);
      expect(detector.validateUrl('https://www.aliexpress.com/item')).toBe(true);
      expect(detector.validateUrl('https://www.dhgate.com/product')).toBe(true);
    });

    it('should invalidate unsupported platform URLs', () => {
      expect(detector.validateUrl('https://www.unsupported.com')).toBe(false);
    });
  });
});
