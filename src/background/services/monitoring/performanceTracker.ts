export class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();

  track(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    if (duration > 1000) {  // 1 second threshold
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  async reportMetrics(): Promise<void> {
    const report = Array.from(this.metrics.entries()).map(([op, times]) => ({
      operation: op,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      max: Math.max(...times),
      min: Math.min(...times)
    }));

    await Storage.set('performance_metrics', report);
  }
}