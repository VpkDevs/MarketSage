import { SecurityAnalyzer, SecurityMetrics } from './protect/securityAnalyzer';
import {
  explainScamSignals,
  getStoredGeminiApiKey,
  signalsFromAnalysis,
  ScamExplanation
} from './protect/scamExplainer';
import { PriceAnalyzer, PriceAnalytics } from './insight/priceAnalyzer';
import { buildPriceInsights, PriceInsight } from './insight/priceInsights';
import {
  ProductDiscoveryService,
  ScoutDiscovery,
  ScoutOptions
} from './scout/productDiscovery';
import { Storage } from '../../common/utils/storage';
import { Product } from '../../common/types';

export class ServiceManager {
  private static instance: ServiceManager;
  private securityAnalyzer: SecurityAnalyzer;
  private priceAnalyzer: PriceAnalyzer;
  private productDiscovery: ProductDiscoveryService;

  private constructor() {
    this.securityAnalyzer = new SecurityAnalyzer();
    this.priceAnalyzer = new PriceAnalyzer();
    this.productDiscovery = new ProductDiscoveryService();
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

        case 'DISCOVER_PRODUCTS':
          const discovery = await this.discoverProducts(request.options ?? {});
          sendResponse({ success: true, data: discovery });
          break;

        case 'ANALYZE_PRICE_DATA':
          const priceData = await this.analyzePriceData();
          sendResponse({ success: true, data: priceData });
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

  /**
   * Scout discovery over the device's local product cache and price
   * history. When no search query is given, the product on the active
   * tab (if any) is used as the similarity context; extraction failure
   * simply means value-ranked mode. See services/scout/productDiscovery.
   */
  private async discoverProducts(options: ScoutOptions): Promise<ScoutDiscovery> {
    let contextProduct = options.contextProduct ?? null;
    if (!options.query && !contextProduct) {
      contextProduct = await this.tryExtractActiveProduct();
    }
    return this.productDiscovery.discover({ ...options, contextProduct });
  }

  /** Extract the active tab's product without analyzing or caching it. */
  private async tryExtractActiveProduct(): Promise<Product | null> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return null;
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PRODUCT' });
      return response?.success && response.data ? (response.data as Product) : null;
    } catch {
      return null;
    }
  }

  /**
   * Full price data for the Insight tab: the standard page analysis
   * plus deterministic insights computed from the recorded price
   * history (see services/insight/priceInsights).
   */
  private async analyzePriceData(): Promise<{
    product: Product;
    pricing: PriceAnalytics;
    insights: PriceInsight[];
    historyCount: number;
  }> {
    const analysis = await this.analyzeCurrentPage();
    const insights = buildPriceInsights(
      analysis.product,
      analysis.pricing,
      analysis.pricing.priceHistory
    );
    return {
      product: analysis.product,
      pricing: analysis.pricing,
      insights,
      historyCount: analysis.pricing.priceHistory.length
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

// Create and export the singleton instance (via getInstance: the
// constructor is private, and a second instance would double-register
// the runtime message listeners).
export const serviceManager = ServiceManager.getInstance();
