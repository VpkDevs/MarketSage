import { Product, Platform, Price } from '../../common/types';
import { DataProcessing } from '../../common/utils/dataProcessing';
import { PriceExtractor } from './priceExtractor';

export class ProductExtractor {
  private platform: Platform;
  private priceExtractor: PriceExtractor;

  constructor() {
    this.platform = Platform.UNKNOWN;
    this.priceExtractor = new PriceExtractor();
  }

  setPlatform(platform: Platform) {
    this.platform = platform;
    this.priceExtractor.setPlatform(platform);
  }

  async extract(): Promise<Product> {
    const selectors = this.getPlatformSelectors();
    
    return {
      id: await this.extractProductId(),
      title: this.extractTitle(selectors.title),
      description: this.extractDescription(selectors.description),
      price: await this.priceExtractor.extract(),
      images: this.extractImages(selectors.images),
      seller: await this.extractSeller(selectors.seller),
      platform: this.platform,
      url: window.location.href
    };
  }

  private getPlatformSelectors(): {
    title: string;
    description: string;
    images: string;
    seller: {
      name: string;
      rating: string;
    };
  } {
    switch (this.platform) {
      case Platform.TEMU:
        return {
          title: '.product-title, .item-title',
          description: '.product-description, .item-description',
          images: '.product-image img, .gallery-image img',
          seller: {
            name: '.seller-name, .store-name',
            rating: '.seller-rating, .store-rating'
          }
        };
      case Platform.ALIEXPRESS:
        return {
          title: '.product-title-text',
          description: '.product-description',
          images: '.magnifier-image img',
          seller: {
            name: '.shop-name',
            rating: '.shop-rate-score'
          }
        };
      case Platform.DHGATE:
        return {
          title: '.product-name',
          description: '.product-desc',
          images: '.product-img img',
          seller: {
            name: '.store-info-name',
            rating: '.store-info-rating'
          }
        };
      default:
        return {
          title: '',
          description: '',
          images: '',
          seller: {
            name: '',
            rating: ''
          }
        };
    }
  }

  private async extractProductId(): Promise<string> {
    // Try to get ID from meta tag first
    const metaProduct = document.querySelector('meta[property="product:id"]');
    const metaId = metaProduct?.getAttribute('content');
    if (metaId) {
      return metaId;
    }

    // Then try URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id') || urlParams.get('productId');
    if (idFromUrl) {
      return idFromUrl;
    }

    // Try to extract from pathname
    const pathMatch = window.location.pathname.match(/[^\/]+$/);
    if (pathMatch && pathMatch[0] !== 'unknown') {
      const lastSegment = pathMatch[0];
      // Check if the last segment is numeric or alphanumeric
      if (/^[a-zA-Z0-9]+$/.test(lastSegment)) {
        return lastSegment;
      }
    }

    // Default fallback
    return 'unknown';
  }

  private extractTitle(selector: string): string {
    if (!selector) return '';
    const titleElement = document.querySelector(selector);
    return DataProcessing.normalizeTitle(titleElement?.textContent || '');
  }

  private extractDescription(selector: string): string {
    if (!selector) return '';
    const descElement = document.querySelector(selector);
    return descElement?.textContent?.trim() || '';
  }

  private extractImages(selector: string): string[] {
    if (!selector) return [];
    const imageElements = document.querySelectorAll<HTMLImageElement>(selector);
    const images: string[] = [];
    
    imageElements.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('placeholder') && src.trim() !== '') {
        images.push(src);
      }
    });

    return [...new Set(images)]; // Remove duplicates
  }

  private async extractSeller(selectors: { name: string; rating: string }): Promise<{
    id: string;
    name: string;
    rating?: number;
  }> {
    const nameElement = document.querySelector(selectors.name);
    const ratingElement = document.querySelector(selectors.rating);
    const ratingText = ratingElement?.textContent?.trim() || '';
    const rating = parseFloat(ratingText);

    return {
      id: this.extractSellerId(),
      name: nameElement?.textContent?.trim() || 'Unknown Seller',
      rating: !isNaN(rating) ? rating : undefined
    };
  }

  private extractSellerId(): string {
    // Try to get seller ID from URL or page data
    const urlParams = new URLSearchParams(window.location.search);
    const sellerIdFromUrl = urlParams.get('seller') || urlParams.get('storeId');
    if (sellerIdFromUrl) return sellerIdFromUrl;

    // Fallback to store page URL if available
    const storeLink = document.querySelector('a[href*="store"]');
    if (storeLink) {
      const href = storeLink.getAttribute('href') || '';
      const storeIdMatch = href.match(/store\/(\d+)/);
      if (storeIdMatch) return storeIdMatch[1];
    }

    return 'unknown';
  }
}
