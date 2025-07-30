export class IntelligentCache {
  private static instance: IntelligentCache;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly config = AppConfig.getInstance();
  private readonly metrics = new PerformanceTracker();

  private constructor() {
    this.startMaintenanceLoop();
  }

  static getInstance(): IntelligentCache {
    if (!IntelligentCache.instance) {
      IntelligentCache.instance = new IntelligentCache();
    }
    return IntelligentCache.instance;
  }

  async get<T>(key: string, category: CacheCategory): Promise<T | null> {
    const startTime = performance.now();
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        await this.metrics.recordMiss(category);
        return null;
      }

      if (this.isExpired(entry, category)) {
        await this.remove(key);
        return null;
      }

      await this.metrics.recordHit(category);
      entry.lastAccessed = Date.now();
      return entry.data as T;
    } finally {
      this.metrics.track('cache_get', startTime);
    }
  }

  async set<T>(key: string, data: T, category: CacheCategory): Promise<void> {
    const startTime = performance.now();
    try {
      await this.ensureCapacity();
      
      this.cache.set(key, {
        data,
        category,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        size: this.calculateSize(data)
      });

      await this.metrics.recordSet(category);
    } finally {
      this.metrics.track('cache_set', startTime);
    }
  }

  private async ensureCapacity(): Promise<void> {
    if (this.cache.size >= this.config.get('cache.maxSize')) {
      await this.evictLeastRecentlyUsed();
    }
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldest: [string, CacheEntry] | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.lastAccessed < oldest[1].lastAccessed) {
        oldest = [key, entry];
      }
    }

    if (oldest) {
      await this.remove(oldest[0]);
    }
  }

  private startMaintenanceLoop(): void {
    setInterval(() => {
      this.performMaintenance();
    }, 60000); // Run every minute
  }

  private async performMaintenance(): Promise<void> {
    const startTime = performance.now();
    try {
      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry, entry.category)) {
          await this.remove(key);
        }
      }
    } finally {
      this.metrics.track('cache_maintenance', startTime);
    }
  }
}