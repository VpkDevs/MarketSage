export class IntelligentCache {
  private static readonly TTL = {
    PRODUCT: 24 * 60 * 60 * 1000,  // 24 hours
    SELLER: 7 * 24 * 60 * 60 * 1000,  // 7 days
    PRICE_HISTORY: 30 * 24 * 60 * 60 * 1000  // 30 days
  };

  async get<T>(key: string, category: 'PRODUCT' | 'SELLER' | 'PRICE_HISTORY'): Promise<T | null> {
    const cached = await Storage.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL[category]) {
      await Storage.remove(key);
      return null;
    }
    
    return cached.data;
  }

  async set<T>(key: string, data: T, category: 'PRODUCT' | 'SELLER' | 'PRICE_HISTORY'): Promise<void> {
    await Storage.set(key, {
      data,
      timestamp: Date.now(),
      category
    });
  }
}