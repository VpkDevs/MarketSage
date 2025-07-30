export class AdaptiveRateLimiter {
  private requestCounts: Map<string, number> = new Map();
  private lastReset: number = Date.now();
  private readonly WINDOW_MS = 60000;  // 1 minute
  private readonly INITIAL_LIMIT = 60;  // 1 request per second
  private currentLimit: number = this.INITIAL_LIMIT;

  async shouldAllow(endpoint: string): Promise<boolean> {
    this.resetIfNeeded();
    
    const currentCount = this.requestCounts.get(endpoint) || 0;
    if (currentCount >= this.currentLimit) {
      return false;
    }

    this.requestCounts.set(endpoint, currentCount + 1);
    return true;
  }

  adjustLimit(responseTime: number): void {
    // Dynamically adjust rate limit based on response times
    if (responseTime > 1000) {  // Slow responses
      this.currentLimit = Math.max(10, this.currentLimit * 0.8);
    } else {  // Fast responses
      this.currentLimit = Math.min(120, this.currentLimit * 1.1);
    }
  }

  private resetIfNeeded(): void {
    if (Date.now() - this.lastReset > this.WINDOW_MS) {
      this.requestCounts.clear();
      this.lastReset = Date.now();
    }
  }
}