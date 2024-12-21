import { Product, Platform, Price } from '../../common/types';
import { DataProcessing } from '../../common/utils/dataProcessing';
import { PriceExtractor } from './priceExtractor';
import { PlatformDetector } from './platformDetector';

export class ProductExtractor {
  private platformDetector: PlatformDetector;
  private priceExtractor: PriceExtractor;

  constructor() {
    this.platformDetector = new PlatformDetector();
    this.priceExtractor = new PriceExtractor();
  }

  async extract(): Promise<Product> {
    if (!this.platformDetector.isSupported()) {
      throw new Error('Unsupported platform');
    }

    const config = this.platformDetector.getConfig();
    
    return {
      id: await this.extractProductId(),
      title: this.extractTitle(),
      description: this.extractDescription(),
      price: await this.priceExtractor.extract(),
      images: this.extractImages(),
      seller: await this.extractSeller(),
      platform: this.platformDetector.getCurrentPlatform(),
      url: window.location.href
    };
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

  private extractTitle(): string {
    const titleSelector = this.platformDetector.getSelector('title');
    const titleElement = document.querySelector(titleSelector);
    return DataProcessing.normalizeTitle(titleElement?.textContent || '');
  }

  private extractDescription(): string | undefined {
    const descriptionSelector = this.platformDetector.getSelector('description');
    const descElement = document.querySelector(descriptionSelector);
    const description = descElement?.textContent?.trim();
    return description || undefined;
  }

  private extractImages(): string[] {
    const images: string[] = [];
    
    // Try to find image gallery or main product image
    const selectors = [
      'img[data-role="product-image"]',
      '.product-gallery img',
      '.product-image img',
      '.gallery-image img'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll<HTMLImageElement>(selector);
      elements.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.includes('placeholder') && src.trim() !== '') {
          images.push(src);
        }
      });
    });

    return [...new Set(images)]; // Remove duplicates
  }

  private async extractSeller(): Promise<{
    id: string;
    name: string;
    rating?: number;
  }> {
    const sellerSelector = this.platformDetector.getSelector('seller');
    const nameElement = document.querySelector(sellerSelector);
    
    // Try to find seller rating
    const ratingSelectors = [
      '.seller-rating',
      '.store-rating',
      '.shop-rating'
    ];
    
    const ratingElement = ratingSelectors
      .map(selector => document.querySelector(selector))
      .find(element => element !== null);

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
