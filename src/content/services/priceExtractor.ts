 import { Platform, Price } from '../../common/types';
import { DataProcessing } from '../../common/utils/dataProcessing';
import { PlatformDetector } from './platformDetector';

export class PriceExtractor {
  private platformDetector: PlatformDetector;

  constructor() {
    this.platformDetector = new PlatformDetector();
  }

  async extract(): Promise<Price> {
    if (!this.platformDetector.isSupported()) {
      return {
        current: 0,
        currency: 'USD',
        original: undefined,
        discount: undefined
      };
    }

    const platform = this.platformDetector.getCurrentPlatform();
    const priceSelector = this.platformDetector.getSelector('price');
    const currentElement = document.querySelector(priceSelector);

    // Define all selectors
    const originalSelectors = [];
    
    // Add platform-specific selectors
    switch (platform) {
      case Platform.ALIEXPRESS:
        originalSelectors.push('.product-price-original', '.product-price-del');
        break;
      case Platform.DHGATE:
        originalSelectors.push('.price-was', '.original-price');
        break;
      case Platform.TEMU:
        originalSelectors.push('.original-price', '.old-price', '.was-price');
        break;
    }
    
    // Add common fallback selectors
    originalSelectors.push('.original-price', '.old-price', '.was-price');
    
    const originalElement = originalSelectors
      .map(selector => document.querySelector(selector))
      .find(element => element !== null) || null; // Ensure null instead of undefined
    
    const currentPrice = this.getCurrentPrice(currentElement);
    const originalPrice = this.getOriginalPrice(originalElement);
    const currency = this.getCurrency(currentElement?.textContent || '', platform);
    
    return {
      current: currentPrice,
      currency,
      original: originalPrice,
      discount: originalPrice ? DataProcessing.calculateDiscount(originalPrice, currentPrice) : undefined
    };
  }

  private getCurrentPrice(element: Element | null): number {
    if (!element) return 0;
    return DataProcessing.extractNumericPrice(element.textContent || '');
  }

  private getOriginalPrice(element: Element | null): number | undefined {
    if (!element) return undefined;
    const price = DataProcessing.extractNumericPrice(element.textContent || '');
    return price > 0 ? price : undefined;
  }

  private getCurrency(priceText: string, platform: Platform): string {
    // Define currency symbols in order of precedence
    const currencySymbols = [
      { symbol: '€', currency: 'EUR' },
      { symbol: '£', currency: 'GBP' },
      { symbol: '¥', currency: 'CNY' },
      { symbol: '$', currency: 'USD' }
    ];

    // First try to detect from price text
    for (const { symbol, currency } of currencySymbols) {
      if (priceText.includes(symbol)) {
        return currency;
      }
    }

    // If no symbol found, use platform default
    switch (platform) {
      case Platform.ALIEXPRESS:
        return 'EUR';
      case Platform.DHGATE:
        return 'GBP';
      case Platform.TEMU:
        return 'USD';
      default:
        return 'USD';
    }
  }
}
