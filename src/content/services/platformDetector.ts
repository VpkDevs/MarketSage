import { PlatformConfig } from '../../common/types';
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../../common/errors/ErrorHandler';

/**
 * Supported marketplace platforms
 */
export enum Platform {
  TEMU = 'temu',
  ALIEXPRESS = 'aliexpress',
  DHGATE = 'dhgate',
  UNKNOWN = 'unknown'
}

/**
 * Platform configuration registry
 */
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  [Platform.TEMU]: {
    name: Platform.TEMU,
    baseUrl: 'temu.com',
    selectors: {
      price: '.price-current, .product-price, .actual-price',
      title: '.product-title, .item-title',
      seller: '.seller-name, .store-name',
      shipping: '.shipping-info, .delivery-info',
      description: '.product-description, .item-description',
      specifications: '.specifications-container, .product-specs, .specifications'
    },
    apiEndpoints: {
      search: '/api/search',
      product: '/api/product',
      seller: '/api/seller'
    }
  },
  [Platform.ALIEXPRESS]: {
    name: Platform.ALIEXPRESS,
    baseUrl: 'aliexpress.com',
    selectors: {
      price: '.product-price-value',
      title: '.product-title-text',
      seller: '.shop-name',
      shipping: '.product-shipping-info',
      description: '.product-description',
      specifications: '.specification, .product-property-list'
    },
    apiEndpoints: {
      search: '/api/v2/search.json',
      product: '/api/v2/product.json',
      seller: '/api/v2/seller.json'
    }
  },
  [Platform.DHGATE]: {
    name: Platform.DHGATE,
    baseUrl: 'dhgate.com',
    selectors: {
      price: '.price, .price-now',
      title: '.product-name',
      seller: '.seller-info, .store-info-name',
      shipping: '.shipping-cost, .shipping-section',
      description: '.product-description, .product-desc',
      specifications: '.specifications, .product-attrs'
    },
    apiEndpoints: {
      search: '/wholesale/search.html',
      product: '/product/detail.html',
      seller: '/seller/detail.html'
    }
  },
  [Platform.UNKNOWN]: {
    name: Platform.UNKNOWN,
    baseUrl: '',
    selectors: {
      price: '',
      title: '',
      seller: '',
      shipping: '',
      description: '',
      specifications: ''
    }
  }
};

/**
 * Service for detecting and working with marketplace platforms
 */
export class PlatformDetector {
  private currentPlatform: Platform = Platform.UNKNOWN;
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.currentPlatform = this.detectPlatform();
  }

  /**
   * Detect the current platform based on the URL
   * @returns The detected platform
   */
  detectPlatform(): Platform {
    try {
      const url = window.location.href.toLowerCase();
      
      for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
        if (platform !== Platform.UNKNOWN && this.validateUrl(url, config.baseUrl)) {
          this.currentPlatform = platform as Platform;
          return this.currentPlatform;
        }
      }
      
      this.currentPlatform = Platform.UNKNOWN;
      return Platform.UNKNOWN;
    } catch (error) {
      this.errorHandler.error(
        'Failed to detect platform',
        'PLATFORM_DETECTION_ERROR',
        ErrorSeverity.MEDIUM,
        ErrorCategory.UI,
        { error, url: window.location.href }
      );
      this.currentPlatform = Platform.UNKNOWN;
      return Platform.UNKNOWN;
    }
  }

  /**
   * Get the current platform
   * @returns The current platform
   */
  getCurrentPlatform(): Platform {
    return this.currentPlatform;
  }

  /**
   * Get the configuration for the current platform
   * @returns The platform configuration
   */
  getConfig(): PlatformConfig {
    return PLATFORM_CONFIGS[this.currentPlatform];
  }

  /**
   * Get a specific selector for the current platform
   * @param type The selector type
   * @returns The selector string
   */
  getSelector(type: keyof PlatformConfig['selectors']): string {
    return PLATFORM_CONFIGS[this.currentPlatform].selectors[type];
  }

  /**
   * Check if the current platform is supported
   * @returns True if the platform is supported
   */
  isSupported(): boolean {
    return this.currentPlatform !== Platform.UNKNOWN;
  }

  /**
   * Validate if a URL belongs to a specific platform
   * @param url The URL to check
   * @param baseUrl The platform's base URL
   * @returns True if the URL belongs to the platform
   */
  private validateUrl(url: string, baseUrl: string): boolean {
    if (!baseUrl) return false;
    
    try {
      return url.includes(baseUrl);
    } catch (error) {
      this.errorHandler.error(
        'Failed to validate URL',
        'URL_VALIDATION_ERROR',
        ErrorSeverity.LOW,
        ErrorCategory.VALIDATION,
        { error, url, baseUrl }
      );
      return false;
    }
  }

  /**
   * Check if a URL is from any supported platform
   * @param url The URL to check
   * @returns True if the URL is from a supported platform
   */
  isSupportedUrl(url: string): boolean {
    try {
      const lowercaseUrl = url.toLowerCase();
      return Object.values(Platform)
        .filter(platform => platform !== Platform.UNKNOWN)
        .some(platform => lowercaseUrl.includes(PLATFORM_CONFIGS[platform].baseUrl));
    } catch (error) {
      this.errorHandler.error(
        'Failed to check if URL is supported',
        'URL_SUPPORT_CHECK_ERROR',
        ErrorSeverity.LOW,
        ErrorCategory.VALIDATION,
        { error, url }
      );
      return false;
    }
  }
}