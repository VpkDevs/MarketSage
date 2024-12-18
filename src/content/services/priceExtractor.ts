import { Platform, Price } from '../../common/types';
import { DataProcessing } from '../../common/utils/dataProcessing';

export class PriceExtractor {
  private platform: Platform;

  constructor() {
    this.platform = Platform.UNKNOWN;
  }

  setPlatform(platform: Platform) {
    this.platform = platform;
  }

  async extract(): Promise<Price> {
    if (this.platform === Platform.UNKNOWN) {
      return {
        current: 0,
        currency: 'USD',
        original: undefined,
        discount: undefined
      };
    }

    const selectors = this.getPlatformSelectors();
    const currentElement = document.querySelector(selectors.current);
    const originalElement = document.querySelector(selectors.original);
    
    const currentPrice = this.getCurrentPrice(currentElement);
    const originalPrice = this.getOriginalPrice(originalElement);
    const currency = this.getCurrency(currentElement?.textContent || '', selectors.current);
    
    return {
      current: currentPrice,
      currency,
      original: originalPrice,
      discount: originalPrice ? DataProcessing.calculateDiscount(originalPrice, currentPrice) : undefined
    };
  }

  private getPlatformSelectors(): { current: string; original: string } {
    const commonSelectors = {
      current: '.price-current',
      original: '.price-original'
    };

    switch (this.platform) {
      case Platform.TEMU:
        return {
          current: '.price-current, .actual-price',
          original: '.price-original, .original-price'
        };
      case Platform.ALIEXPRESS:
        return {
          current: '.price-current, .product-price-value',
          original: '.price-original, .product-price-original'
        };
      case Platform.DHGATE:
        return {
          current: '.price-current, .price-now',
          original: '.price-original, .price-was'
        };
      default:
        return commonSelectors;
    }
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

  private getCurrency(priceText: string, selector: string): string {
    // If using platform-specific selector, use platform default currency
    if (!selector.includes('.price-current')) {
      switch (this.platform) {
        case Platform.ALIEXPRESS:
          return 'EUR';
        case Platform.DHGATE:
          return 'GBP';
        default:
          break;
      }
    }

    // Define currency symbols in order of precedence
    const currencySymbols = [
      { symbol: '€', currency: 'EUR' },
      { symbol: '£', currency: 'GBP' },
      { symbol: '¥', currency: 'CNY' },
      { symbol: '$', currency: 'USD' }
    ];

    // Find the first matching currency symbol
    for (const { symbol, currency } of currencySymbols) {
      if (priceText.includes(symbol)) {
        return currency;
      }
    }

    // Default to USD
    return 'USD';
  }
}
