import { Platform, Price } from '../../common/types';
import { DataProcessing } from '../../common/utils/dataProcessing';
import { PlatformDetector } from './platformDetector';
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../../common/errors/ErrorHandler';
import { SecurityUtils } from '../../common/security/SecurityUtils';

/**
 * Service for extracting price information from product pages
 */
export class PriceExtractor {
  private platformDetector: PlatformDetector;
  private errorHandler: ErrorHandler;

  constructor() {
    this.platformDetector = new PlatformDetector();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * Extract price information from the current page
   * @returns Price information object
   */
  async extract(): Promise<Price> {
    try {
      if (!this.platformDetector.isSupported()) {
        return this.getDefaultPrice();
      }

      const platform = this.platformDetector.getCurrentPlatform();
      const priceSelector = this.platformDetector.getSelector('price');
      
      // Try to find the current price element
      const currentElement = document.querySelector(priceSelector);
      if (!currentElement) {
        this.errorHandler.error(
          'Price element not found',
          'PRICE_ELEMENT_NOT_FOUND',
          ErrorSeverity.MEDIUM,
          ErrorCategory.UI,
          { selector: priceSelector, url: window.location.href }
        );
        return this.getDefaultPrice();
      }

      // Get original price element using platform-specific selectors
      const originalElement = this.findOriginalPriceElement(platform);
      
      // Extract prices and currency
      const currentPrice = this.getCurrentPrice(currentElement);
      const originalPrice = this.getOriginalPrice(originalElement);
      const currency = this.getCurrency(currentElement?.textContent || '', platform);
      
      // Calculate discount if we have both prices
      const discount = originalPrice 
        ? DataProcessing.calculateDiscount(originalPrice, currentPrice) 
        : undefined;
      
      return {
        current: currentPrice,
        currency,
        original: originalPrice,
        discount
      };
    } catch (error) {
      this.errorHandler.error(
        'Failed to extract price information',
        'PRICE_EXTRACTION_ERROR',
        ErrorSeverity.MEDIUM,
        ErrorCategory.UI,
        { error, url: window.location.href }
      );
      return this.getDefaultPrice();
    }
  }

  /**
   * Find the element containing the original price
   * @param platform The current platform
   * @returns The original price element or null if not found
   */
  private findOriginalPriceElement(platform: Platform): Element | null {
    try {
      // Define platform-specific selectors
      const originalSelectors: string[] = [];
      
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
      originalSelectors.push('.original-price', '.old-price', '.was-price', '.list-price');
      
      // Try each selector until we find a match
      for (const selector of originalSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      }
      
      return null;
    } catch (error) {
      this.errorHandler.error(
        'Error finding original price element',
        'ORIGINAL_PRICE_ELEMENT_ERROR',
        ErrorSeverity.LOW,
        ErrorCategory.UI,
        { error, platform }
      );
      return null;
    }
  }

  /**
   * Extract the current price from an element
   * @param element The element containing the price
   * @returns The numeric price value
   */
  private getCurrentPrice(element: Element | null): number {
    try {
      if (!element) return 0;
      
      const priceText = element.textContent || '';
      const sanitizedText = SecurityUtils.sanitizeInput(priceText);
      return DataProcessing.extractNumericPrice(sanitizedText);
    } catch (error) {
      this.errorHandler.error(
        'Error extracting current price',
        'CURRENT_PRICE_EXTRACTION_ERROR',
        ErrorSeverity.LOW,
        ErrorCategory.UI,
        { error, elementText: element?.textContent }
      );
      return 0;
    }
  }

  /**
   * Extract the original price from an element
   * @param element The element containing the original price
   * @returns The numeric original price value or undefined if not available
   */
  private getOriginalPrice(element: Element | null): number | undefined {
    try {
      if (!element) return undefined;
      
      const priceText = element.textContent || '';
      const sanitizedText = SecurityUtils.sanitizeInput(priceText);
      const price = DataProcessing.extractNumericPrice(sanitizedText);
      
      return price > 0 ? price : undefined;
    } catch (error) {
      this.errorHandler.error(
        'Error extracting original price',
        'ORIGINAL_PRICE_EXTRACTION_ERROR',
        ErrorSeverity.LOW,
        ErrorCategory.UI,
        { error, elementText: element?.textContent }
      );
      return undefined;
    }
  }

  /**
   * Determine the currency from price text and platform
   * @param priceText The text containing the price
   * @param platform The current platform
   * @returns The currency code
   */
  private getCurrency(priceText: string, platform: Platform): string {
    try {
      // Define currency symbols in order of precedence
      const currencySymbols = [
        { symbol: '€', currency: 'EUR' },
        { symbol: '£', currency: 'GBP' },
        { symbol: '¥', currency: 'CNY' },
        { symbol: 'руб', currency: 'RUB' },
        { symbol: '₽', currency: 'RUB' },
        { symbol: 'A$', currency: 'AUD' },
        { symbol: 'C$', currency: 'CAD' },
        { symbol: '$', currency: 'USD' }
      ];

      const sanitizedText = SecurityUtils.sanitizeInput(priceText);
      
      // First try to detect from price text
      for (const { symbol, currency } of currencySymbols) {
        if (sanitizedText.includes(symbol)) {
          return currency;
        }
      }

      // If no symbol found, use platform default
      switch (platform) {
        case Platform.ALIEXPRESS:
          return 'USD';
        case Platform.DHGATE:
          return 'USD';
        case Platform.TEMU:
          return 'USD';
        default:
          return 'USD';
      }
    } catch (error) {
      this.errorHandler.error(
        'Error determining currency',
        'CURRENCY_DETECTION_ERROR',
        ErrorSeverity.LOW,
        ErrorCategory.UI,
        { error, priceText, platform }
      );
      return 'USD';
    }
  }

  /**
   * Get a default price object for fallback
   * @returns Default price object
   */
  private getDefaultPrice(): Price {
    return {
      current: 0,
      currency: 'USD',
      original: undefined,
      discount: undefined
    };
  }
}