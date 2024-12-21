import { Platform, PlatformConfig } from '../../common/types';

export class PlatformDetector {
  private static readonly platformConfigs: Record<Platform, PlatformConfig> = {
    [Platform.TEMU]: {
      name: Platform.TEMU,
      baseUrl: 'temu.com',
      selectors: {
        price: '.product-price, .actual-price',
        title: '.product-title, .item-title',
        seller: '.seller-name, .store-name',
        shipping: '.shipping-info, .delivery-info',
        description: '.product-description, .item-description',
        specifications: '.product-specs, .specifications'
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
        specifications: '.product-property-list'
      }
    },
    [Platform.DHGATE]: {
      name: Platform.DHGATE,
      baseUrl: 'dhgate.com',
      selectors: {
        price: '.price-now',
        title: '.product-name',
        seller: '.store-info-name',
        shipping: '.shipping-section',
        description: '.product-desc',
        specifications: '.product-attrs'
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

  private currentPlatform: Platform = Platform.UNKNOWN;
  private config: PlatformConfig;

  constructor() {
    this.currentPlatform = this.detectPlatform();
    this.config = PlatformDetector.platformConfigs[this.currentPlatform];
  }

  private detectPlatform(): Platform {
    const url = window.location.href.toLowerCase();
    
    if (url.includes('temu.com')) {
      return Platform.TEMU;
    }
    
    if (url.includes('aliexpress.com')) {
      return Platform.ALIEXPRESS;
    }
    
    if (url.includes('dhgate.com')) {
      return Platform.DHGATE;
    }
    
    return Platform.UNKNOWN;
  }

  public getCurrentPlatform(): Platform {
    return this.currentPlatform;
  }

  public getConfig(): PlatformConfig {
    return this.config;
  }

  public getSelector(type: keyof PlatformConfig['selectors']): string {
    return this.config.selectors[type];
  }

  public isSupported(): boolean {
    return this.currentPlatform !== Platform.UNKNOWN;
  }

  public validateUrl(url: string): boolean {
    const supportedPlatforms = Object.values(Platform)
      .filter(platform => platform !== Platform.UNKNOWN)
      .map(platform => PlatformDetector.platformConfigs[platform].baseUrl);

    return supportedPlatforms.some(domain => url.toLowerCase().includes(domain));
  }
}
