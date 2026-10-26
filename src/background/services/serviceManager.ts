import { SecurityAnalyzer, SecurityMetrics } from './protect/securityAnalyzer';
import {
  explainScamSignals,
  getStoredGeminiApiKey,
  signalsFromAnalysis,
  ScamExplanation
} from './protect/scamExplainer';
import { PriceAnalyzer, PriceAnalytics } from './insight/priceAnalyzer';
import { Storage } from '../../common/utils/storage';
import { Product } from '../../common/types';

export class ServiceManager {
  private static instance: ServiceManager;
  private securityAnalyzer: SecurityAnalyzer;
  private priceAnalyzer: PriceAnalyzer;

  private constructor() {
    this.securityAnalyzer = new SecurityAnalyzer();
    this.priceAnalyzer = new PriceAnalyzer();
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
          const analysis = await this.analyzeCurrentPage();
          sendResponse({ success: true, data: analysis });
          break;

        case 'ANALYZE_PRODUCT':
          // Sent by the content script, which extracted the product from
          // the page DOM (the service worker has no DOM access).
          if (!request.product) {
            sendResponse({ success: false, error: 'No product supplied' });
            break;
          }
          const productAnalysis = await this.analyzeProduct(request.product as Product);
          sendResponse({ success: true, data: productAnalysis });
          break;

        case 'GET_SECURITY_METRICS':
          const securityMetrics = await this.getSecurityMetrics(request.productId);
          sendResponse({ success: true, data: securityMetrics });
          break;

        case 'GET_PRICE_ANALYTICS':
          const priceAnalytics = await this.getPriceAnalytics(request.productId);
          sendResponse({ success: true, data: priceAnalytics });
          break;

        case 'EXPLAIN_RISK':
          const explanation = await this.explainRisk(request.productId);
          sendResponse({ success: true, data: explanation });
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

  private async analyzeCurrentPage(): Promise<{
    product: Product;
    security: SecurityMetrics;
    pricing: PriceAnalytics;
  }> {
    // Runtime messages from the popup carry no sender.tab (a popup is not
    // a tab), so resolve the active tab explicitly and let the content
    // script — the only context with DOM access — extract the product.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PRODUCT' });
    if (!response?.success || !response.data) {
      throw new Error(response?.error || 'Failed to extract product from page');
    }

    return this.analyzeProduct(response.data as Product);
  }

  private async analyzeProduct(product: Product): Promise<{
    product: Product;
    security: SecurityMetrics;
    pricing: PriceAnalytics;
  }> {
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

  /**
   * Plain-language explanation of a cached product's scam signals.
   * Uses the user's own Gemini key when one is stored in settings;
   * otherwise (and on any AI failure) returns the built-in template
   * explanation. See protect/scamExplainer.
   */
  private async explainRisk(productId: string): Promise<ScamExplanation> {
    const product = await Storage.getCachedProduct(productId);
    if (!product) {
      throw new Error('Product not found in cache');
    }
    const metrics = await this.securityAnalyzer.analyzeProduct(product);
    const apiKey = await getStoredGeminiApiKey();
    return explainScamSignals(signalsFromAnalysis(product, metrics), { apiKey });
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

// Create and export the singleton instance (via getInstance: the
// constructor is private, and a second instance would double-register
// the runtime message listeners).
export const serviceManager = ServiceManager.getInstance();
