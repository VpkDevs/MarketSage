import { Product, Price } from '../types';
import { UserScamDetectionPreferences } from '../models/scamDetection/userPreferences';
import {
  TemporalSellerData,
  ProductFingerprint,
  ImageHashEntry,
  FeedbackEntry,
} from '../types/scamDetection';

export class Storage {
  private static readonly PRICE_HISTORY_KEY = 'price_history';
  private static readonly PRODUCT_CACHE_KEY = 'product_cache';
  private static readonly SELLER_RATINGS_KEY = 'seller_ratings';
  private static readonly USER_SCAM_PREFS_KEY = 'user_scam_preferences';
  private static readonly UNIFIED_CART_KEY = 'unified_cart';
  private static readonly CHECKOUT_SESSION_KEY = 'checkout_session';
  private static readonly CATEGORIES_KEY = 'categories';
  private static readonly CURRENT_USER_KEY = 'current_user';
  private static readonly TEMPORAL_SELLER_KEY = 'temporal_seller';
  private static readonly CROSS_LISTING_KEY = 'cross_listing';
  private static readonly IMAGE_HASH_REGISTRY_KEY = 'image_hash_registry';
  private static readonly FEEDBACK_KEY = 'fraud_feedback';
  private static readonly FEEDBACK_WEIGHTS_KEY = 'fraud_feedback_weights';
  private static readonly BLACKLISTED_SELLERS_KEY = 'blacklisted_sellers';
  private static readonly SUSPICIOUS_PATTERNS_KEY = 'suspicious_patterns';

  // Price History Methods
  static async savePriceHistory(productId: string, price: Price): Promise<void> {
    const history = await this.getPriceHistory(productId);
    history.push({
      ...price,
      timestamp: new Date().toISOString()
    });

    await chrome.storage.local.set({
      [`${this.PRICE_HISTORY_KEY}_${productId}`]: history
    });
  }

  static async getPriceHistory(productId: string): Promise<(Price & { timestamp: string })[]> {
    const result = await chrome.storage.local.get(`${this.PRICE_HISTORY_KEY}_${productId}`);
    return result[`${this.PRICE_HISTORY_KEY}_${productId}`] || [];
  }

  // Product Cache Methods
  static async cacheProduct(product: Product): Promise<void> {
    const cache = await this.getProductCache();
    cache[product.id] = {
      ...product,
      timestamp: new Date().toISOString()
    };

    // Remove old entries if cache gets too large (keep last 100 products)
    const entries = Object.entries(cache);
    if (entries.length > 100) {
      const sortedEntries = entries.sort((a, b) =>
        new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime()
      );
      const newCache = Object.fromEntries(sortedEntries.slice(0, 100));
      await chrome.storage.local.set({ [this.PRODUCT_CACHE_KEY]: newCache });
    } else {
      await chrome.storage.local.set({ [this.PRODUCT_CACHE_KEY]: cache });
    }
  }

  static async getProductCache(): Promise<Record<string, Product & { timestamp: string }>> {
    const result = await chrome.storage.local.get(this.PRODUCT_CACHE_KEY);
    return result[this.PRODUCT_CACHE_KEY] || {};
  }

  static async getCachedProduct(productId: string): Promise<(Product & { timestamp: string }) | null> {
    const cache = await this.getProductCache();
    return cache[productId] || null;
  }

  // Seller Ratings Methods
  static async saveSellerRating(sellerId: string, rating: number): Promise<void> {
    const ratings = await this.getSellerRatings();
    if (!ratings[sellerId]) {
      ratings[sellerId] = {
        total: rating,
        count: 1,
        average: rating
      };
    } else {
      ratings[sellerId].total += rating;
      ratings[sellerId].count += 1;
      ratings[sellerId].average = ratings[sellerId].total / ratings[sellerId].count;
    }

    await chrome.storage.local.set({ [this.SELLER_RATINGS_KEY]: ratings });
  }

  static async getSellerRatings(): Promise<Record<string, {
    total: number;
    count: number;
    average: number;
  }>> {
    const result = await chrome.storage.local.get(this.SELLER_RATINGS_KEY);
    return result[this.SELLER_RATINGS_KEY] || {};
  }

  static async getSellerRating(sellerId: string): Promise<number | null> {
    const ratings = await this.getSellerRatings();
    return ratings[sellerId]?.average || null;
  }

  // User Scam Detection Preferences Methods
  static async getUserScamPreferences(userId: string): Promise<UserScamDetectionPreferences | null> {
    const result = await chrome.storage.local.get(`${this.USER_SCAM_PREFS_KEY}_${userId}`);
    return result[`${this.USER_SCAM_PREFS_KEY}_${userId}`] || null;
  }

  static async setUserScamPreferences(userId: string, preferences: UserScamDetectionPreferences): Promise<void> {
    await chrome.storage.local.set({
      [`${this.USER_SCAM_PREFS_KEY}_${userId}`]: preferences
    });
  }

  // Unified Cart Methods
  static async saveUnifiedCart(cartItems: any[]): Promise<void> {
    await chrome.storage.local.set({
      [this.UNIFIED_CART_KEY]: cartItems
    });
  }

  static async getUnifiedCart(): Promise<any[]> {
    const result = await chrome.storage.local.get(this.UNIFIED_CART_KEY);
    return result[this.UNIFIED_CART_KEY] || [];
  }

  // Checkout Session Methods
  static async saveCheckoutSession(session: any): Promise<void> {
    await chrome.storage.local.set({
      [`${this.CHECKOUT_SESSION_KEY}_${session.sessionId}`]: session
    });
  }

  static async getCheckoutSession(sessionId: string): Promise<any | null> {
    const result = await chrome.storage.local.get(`${this.CHECKOUT_SESSION_KEY}_${sessionId}`);
    return result[`${this.CHECKOUT_SESSION_KEY}_${sessionId}`] || null;
  }

  // Category Methods
  static async getCategories(): Promise<any[]> {
    const result = await chrome.storage.local.get(this.CATEGORIES_KEY);
    return result[this.CATEGORIES_KEY] || [];
  }

  static async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const cache = await this.getProductCache();
    return Object.values(cache)
      .filter(product => product.categoryId === categoryId)
      .map(product => ({
        ...product,
        timestamp: undefined // Remove timestamp from returned products
      }));
  }

  // User Methods
  static async getCurrentUser(): Promise<any | null> {
    const result = await chrome.storage.local.get(this.CURRENT_USER_KEY);
    return result[this.CURRENT_USER_KEY] || null;
  }

  static async setCurrentUser(user: any): Promise<void> {
    await chrome.storage.local.set({
      [this.CURRENT_USER_KEY]: user
    });
  }

  // Utility Methods
  static async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
  }

  static async clearPriceHistory(): Promise<void> {
    const keys = await this.getAllKeys();
    const priceHistoryKeys = keys.filter(key => key.startsWith(this.PRICE_HISTORY_KEY));
    await chrome.storage.local.remove(priceHistoryKeys);
  }

  private static async getAllKeys(): Promise<string[]> {
    const storage = await chrome.storage.local.get(null);
    return Object.keys(storage);
  }

  // ── Temporal Seller Data ──────────────────────────────────────────────────

  static async getTemporalSellerData(sellerId: string): Promise<TemporalSellerData | null> {
    const result = await chrome.storage.local.get(`${this.TEMPORAL_SELLER_KEY}_${sellerId}`);
    return result[`${this.TEMPORAL_SELLER_KEY}_${sellerId}`] || null;
  }

  static async saveTemporalSellerData(data: TemporalSellerData): Promise<void> {
    await chrome.storage.local.set({
      [`${this.TEMPORAL_SELLER_KEY}_${data.sellerId}`]: data
    });
  }

  // ── Cross-Listing Fingerprint Data ────────────────────────────────────────

  static async getCrossListingFingerprints(): Promise<ProductFingerprint[]> {
    const result = await chrome.storage.local.get(this.CROSS_LISTING_KEY);
    return result[this.CROSS_LISTING_KEY] || [];
  }

  static async saveCrossListingFingerprint(fingerprint: ProductFingerprint): Promise<void> {
    const existing = await this.getCrossListingFingerprints();
    // Replace existing entry for same product+platform, or append
    const idx = existing.findIndex(
      f => f.productId === fingerprint.productId && f.platform === fingerprint.platform
    );
    if (idx >= 0) {
      existing[idx] = fingerprint;
    } else {
      existing.push(fingerprint);
    }
    // Keep most recent 500 entries to avoid unbounded growth
    const trimmed = existing.sort((a, b) => b.timestamp - a.timestamp).slice(0, 500);
    await chrome.storage.local.set({ [this.CROSS_LISTING_KEY]: trimmed });
  }

  // ── Image Hash Registry ───────────────────────────────────────────────────

  static async getImageHashRegistry(): Promise<Record<string, ImageHashEntry>> {
    const result = await chrome.storage.local.get(this.IMAGE_HASH_REGISTRY_KEY);
    return result[this.IMAGE_HASH_REGISTRY_KEY] || {};
  }

  static async saveImageHashEntry(entry: ImageHashEntry): Promise<void> {
    const registry = await this.getImageHashRegistry();
    registry[entry.hash] = entry;
    await chrome.storage.local.set({ [this.IMAGE_HASH_REGISTRY_KEY]: registry });
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  static async getFeedbackEntries(productId?: string): Promise<FeedbackEntry[]> {
    const result = await chrome.storage.local.get(this.FEEDBACK_KEY);
    const all: FeedbackEntry[] = result[this.FEEDBACK_KEY] || [];
    return productId ? all.filter(e => e.productId === productId) : all;
  }

  static async saveFeedbackEntry(entry: FeedbackEntry): Promise<void> {
    const existing = await this.getFeedbackEntries();
    existing.push(entry);
    // Keep most recent 1000 feedback entries
    const trimmed = existing.sort((a, b) => b.timestamp - a.timestamp).slice(0, 1000);
    await chrome.storage.local.set({ [this.FEEDBACK_KEY]: trimmed });
  }

  static async getFeedbackWeights(): Promise<Record<string, number>> {
    const result = await chrome.storage.local.get(this.FEEDBACK_WEIGHTS_KEY);
    return result[this.FEEDBACK_WEIGHTS_KEY] || {};
  }

  static async saveFeedbackWeights(weights: Record<string, number>): Promise<void> {
    await chrome.storage.local.set({ [this.FEEDBACK_WEIGHTS_KEY]: weights });
  }

  // ── Threat Intelligence (used by AdvancedThreatDetection) ────────────────

  static async getBlacklistedSellers(): Promise<string[]> {
    const result = await chrome.storage.local.get(this.BLACKLISTED_SELLERS_KEY);
    return result[this.BLACKLISTED_SELLERS_KEY] || [];
  }

  static async getSuspiciousPatterns(): Promise<any[]> {
    const result = await chrome.storage.local.get(this.SUSPICIOUS_PATTERNS_KEY);
    return result[this.SUSPICIOUS_PATTERNS_KEY] || [];
  }
}
