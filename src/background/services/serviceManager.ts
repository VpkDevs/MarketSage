import { SecurityAnalyzer, SecurityMetrics } from './protect/securityAnalyzer';
import { PriceAnalyzer, PriceAnalytics } from './insight/priceAnalyzer';
import { ProductExtractor } from '../../content/services/productExtractor';
import { Storage } from '../../common/utils/storage';
import { Product } from '../../common/types';

export class ServiceManager {
  private static instance: ServiceManager;
  private securityAnalyzer: SecurityAnalyzer;
  private priceAnalyzer: PriceAnalyzer;
  private productExtractor: ProductExtractor;

  private constructor() {
    this.securityAnalyzer = new SecurityAnalyzer();
    this.priceAnalyzer = new PriceAnalyzer();
    this.productExtractor = new ProductExtractor();
    this.initializeMessageListeners();
  }

  /**
   * Get the singleton instance of ServiceManager
   */
  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private initializeMessageListeners(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async response
    });
  }

  // Changed from private to public
  public async handleMessage(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (request.type) {
        case 'ANALYZE_CURRENT_PAGE':
          const analysis = await this.analyzeCurrentPage(sender.tab?.id);
          sendResponse({ success: true, data: analysis });
          break;

        case 'GET_SECURITY_METRICS':
          const securityMetrics = await this.getSecurityMetrics(request.productId);
          sendResponse({ success: true, data: securityMetrics });
          break;

        case 'GET_PRICE_ANALYTICS':
          const priceAnalytics = await this.getPriceAnalytics(request.productId);
          sendResponse({ success: true, data: priceAnalytics });
          break;

        default:
          sendResponse({ 
            success: false, 
            error: 'Unknown request type' 
          });
      }
    } catch (error) {
      console.error('Service Manager Error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async analyzeCurrentPage(tabId?: number): Promise<{
    product: Product;
    security: SecurityMetrics;
    pricing: PriceAnalytics;
  }> {
    if (!tabId) {
      throw new Error('No active tab found');
    }

    // Extract product data
    const product = await this.productExtractor.extract();
    
    // Store product data
    await Storage.cacheProduct(product);
    await Storage.savePriceHistory(product.id, product.price);

    // Perform analysis
    const [security, pricing] = await Promise.all([
      this.securityAnalyzer.analyzeProduct(product),
      this.priceAnalyzer.analyzePrices(product)
    ]);

    return {
      product,
      security,
      pricing
    };
  }

  private async getSecurityMetrics(productId: string): Promise<SecurityMetrics> {
    const product = await Storage.getCachedProduct(productId);
    if (!product) {
      throw new Error('Product not found in cache');
    }
    return this.securityAnalyzer.analyzeProduct(product);
  }

  private async getPriceAnalytics(productId: string): Promise<PriceAnalytics> {
    const product = await Storage.getCachedProduct(productId);
    if (!product) {
      throw new Error('Product not found in cache');
    }
    return this.priceAnalyzer.analyzePrices(product);
  }

  // Public utility methods for managing services

  public async clearAnalysisCache(): Promise<void> {
    await Storage.clearAll();
  }

  public async refreshAnalysis(productId: string): Promise<{
    security: SecurityMetrics;
    pricing: PriceAnalytics;
  }> {
    const product = await Storage.getCachedProduct(productId);
    if (!product) {
      throw new Error('Product not found in cache');
    }

    const [security, pricing] = await Promise.all([
      this.securityAnalyzer.analyzeProduct(product),
      this.priceAnalyzer.analyzePrices(product)
    ]);

    return {
      security,
      pricing
    };
  }
}

// Create and export a singleton instance
export const serviceManager = new ServiceManager();
