import { ScamDetectionModel } from "../scamDetectionModel";
import { Product, Platform } from "../../types";
import { Storage } from "../../utils/storage";
import { UserPreferences } from "../userPreferences";

// Define interfaces for the unified client
export interface CartItem {
  productId: string;
  platform: Platform;
  title: string;
  price: number;
  quantity: number;
  image: string;
  url: string;
  addedAt: number;
}

export interface ProductFilters {
  minPrice?: number;
  maxPrice?: number;
  categories?: string[];
  sortBy?: 'price' | 'rating' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface BrowseResult {
  products: (Product & { 
    scamAnalysis: any; 
    displayWarning?: boolean; 
    hidden?: boolean 
  })[];
  totalFound: number;
  filtered: number;
  platforms: {
    platform: Platform;
    count: number;
  }[];
}

export interface PlatformCheckout {
  platform: Platform;
  items: CartItem[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  checkoutUrl: string;
  error?: string;
}

export interface CheckoutSession {
  sessionId: string;
  platforms: PlatformCheckout[];
  startedAt: number;
  completedAt?: number;
  status: 'started' | 'in-progress' | 'completed' | 'failed';
}

export class UnifiedBrowserManager {
  private static instance: UnifiedBrowserManager;
  private scamDetector: ScamDetectionModel;
  private userPreferences: UserPreferences;
  private unifiedCart: Map<string, CartItem> = new Map();
  
  private constructor() {
    this.scamDetector = new ScamDetectionModel();
    this.userPreferences = UserPreferences.getInstance();
  }
  
  static getInstance(): UnifiedBrowserManager {
    if (!UnifiedBrowserManager.instance) {
      UnifiedBrowserManager.instance = new UnifiedBrowserManager();
    }
    return UnifiedBrowserManager.instance;
  }
  
  async browseProducts(
    searchQuery: string, 
    filters: ProductFilters,
    userId: string
  ): Promise<BrowseResult> {
    // Fetch products from multiple platforms in parallel
    const platformResults = await Promise.all([
      this.fetchFromPlatform(Platform.ALIEXPRESS, searchQuery, filters),
      this.fetchFromPlatform(Platform.TEMU, searchQuery, filters),
      this.fetchFromPlatform(Platform.DHGATE, searchQuery, filters)
    ]);
    
    // Combine results
    const allProducts = platformResults.flat();
    
    // Apply scam detection to each product
    const productsWithScamAnalysis = await Promise.all(
      allProducts.map(async (product) => {
        const scamAnalysis = await this.scamDetector.analyze({
          title: product.title,
          description: product.description,
          price: product.price.current,
          marketPrice: product.price.market,
          images: product.images,
          sellerId: product.seller?.id,
          categoryId: product.categoryId,
          userId
        });
        
        return {
          ...product,
          scamAnalysis
        };
      })
    );
    
    // Apply user's scam detection preferences for display
    const userPrefs = await this.userPreferences.getScamDetectionPreferences(userId);
    const filteredProducts = this.applyScamDetectionFilters(
      productsWithScamAnalysis,
      userPrefs
    );
    
    return {
      products: filteredProducts,
      totalFound: allProducts.length,
      filtered: allProducts.length - filteredProducts.length,
      platforms: platformResults.map((results, index) => ({
        platform: [Platform.ALIEXPRESS, Platform.TEMU, Platform.DHGATE][index],
        count: results.length
      }))
    };
  }
  
  private async fetchFromPlatform(
    platform: Platform, 
    searchQuery: string, 
    filters: ProductFilters
  ): Promise<Product[]> {
    // Implementation would depend on platform-specific adapters
    // This is a placeholder
    return [];
  }
  
  private applyScamDetectionFilters(
    products: (Product & { scamAnalysis: any })[], 
    preferences: any
  ): (Product & { scamAnalysis: any; displayWarning?: boolean; hidden?: boolean })[] {
    return products.map(product => {
      // Find the action for this product's risk level
      const riskLevel = product.scamAnalysis.overallRiskLevel;
      const action = this.getActionForRiskLevel(riskLevel, preferences);
      
      return {
        ...product,
        displayWarning: action === 'warn' || action === 'highlight',
        hidden: action === 'hide'
      };
    }).filter(product => {
      // Remove hidden products if user preference is to hide them completely
      const hideCompletely = preferences.hideProductsCompletely || false;
      return !(hideCompletely && product.hidden);
    });
  }
  
  private getActionForRiskLevel(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    preferences: any
  ): 'none' | 'notify' | 'warn' | 'highlight' | 'hide' {
    // Map risk level to action based on user preferences
    switch (riskLevel) {
      case 'CRITICAL':
        return preferences.criticalAction || 'hide';
      case 'HIGH':
        return preferences.highAction || 'warn';
      case 'MEDIUM':
        return preferences.mediumAction || 'highlight';
      case 'LOW':
      default:
        return preferences.lowAction || 'none';
    }
  }
  
  async addToUnifiedCart(product: Product, quantity: number): Promise<void> {
    // Add to unified cart
    const cartItem: CartItem = {
      productId: product.id,
      platform: product.platform,
      title: product.title,
      price: product.price.current,
      quantity,
      image: product.images?.[0] || '',
      url: product.url,
      addedAt: Date.now()
    };
    
    this.unifiedCart.set(product.id, cartItem);
    
    // Save to storage
    await Storage.saveUnifiedCart(Array.from(this.unifiedCart.values()));
  }
  
  async getUnifiedCart(): Promise<CartItem[]> {
    // Load from storage if cart is empty
    if (this.unifiedCart.size === 0) {
      const storedCart = await Storage.getUnifiedCart();
      storedCart.forEach(item => {
        this.unifiedCart.set(item.productId, item);
      });
    }
    
    return Array.from(this.unifiedCart.values());
  }
  
  async proceedToCheckout(): Promise<CheckoutSession> {
    // Group cart items by platform
    const itemsByPlatform = new Map<Platform, CartItem[]>();
    
    this.unifiedCart.forEach(item => {
      const platformItems = itemsByPlatform.get(item.platform) || [];
      platformItems.push(item);
      itemsByPlatform.set(item.platform, platformItems);
    });
    
    // Create checkout session
    const checkoutSession: CheckoutSession = {
      sessionId: `checkout-${Date.now()}`,
      platforms: Array.from(itemsByPlatform.entries()).map(([platform, items]) => ({
        platform,
        items,
        status: 'pending',
        checkoutUrl: this.generateCheckoutUrl(platform, items)
      })),
      startedAt: Date.now(),
      status: 'started'
    };
    
    // Save checkout session
    await Storage.saveCheckoutSession(checkoutSession);
    
    return checkoutSession;
  }
  
  private generateCheckoutUrl(platform: Platform, items: CartItem[]): string {
    // Generate platform-specific checkout URL with items
    // This would be implemented differently for each platform
    switch (platform) {
      case Platform.ALIEXPRESS:
        return this.generateAliExpressCheckoutUrl(items);
      case Platform.TEMU:
        return this.generateTemuCheckoutUrl(items);
      case Platform.DHGATE:
        return this.generateDHGateCheckoutUrl(items);
      default:
        return '';
    }
  }
  
  private generateAliExpressCheckoutUrl(items: CartItem[]): string {
    // Implementation would depend on AliExpress API/structure
    return `https://aliexpress.com/cart/checkout?items=${items.map(i => i.productId).join(',')}`;
  }
  
  private generateTemuCheckoutUrl(items: CartItem[]): string {
    // Implementation would depend on Temu API/structure
    return `https://temu.com/checkout?items=${items.map(i => i.productId).join(',')}`;
  }
  
  private generateDHGateCheckoutUrl(items: CartItem[]): string {
    // Implementation would depend on DHGate API/structure
    return `https://dhgate.com/cart/checkout?items=${items.map(i => i.productId).join(',')}`;
  }
  
  async startGuidedCheckout(session: CheckoutSession): Promise<void> {
    // Implementation would guide the user through each platform's checkout process
    // This would involve browser automation or step-by-step instructions
  }
  
  async updateCheckoutStatus(
    sessionId: string, 
    platform: Platform, 
    status: 'pending' | 'in-progress' | 'completed' | 'failed',
    error?: string
  ): Promise<CheckoutSession> {
    // Update status for a specific platform in the checkout session
    const session = await Storage.getCheckoutSession(sessionId);
    
    if (!session) {
      throw new Error(`Checkout session ${sessionId} not found`);
    }
    
    // Update platform status
    const platformIndex = session.platforms.findIndex(p => p.platform === platform);
    if (platformIndex >= 0) {
      session.platforms[platformIndex].status = status;
      if (error) {
        session.platforms[platformIndex].error = error;
      }
    }
    
    // Check if all platforms are completed or failed
    const allCompleted = session.platforms.every(p => 
      p.status === 'completed' || p.status === 'failed'
    );
    
    if (allCompleted) {
      session.status = 'completed';
      session.completedAt = Date.now();
    }
    
    // Save updated session
    await Storage.saveCheckoutSession(session);
    
    return session;
  }
}
