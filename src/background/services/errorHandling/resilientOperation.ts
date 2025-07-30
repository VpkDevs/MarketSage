export class ResilientOperation {
  private static readonly MAX_RETRIES = 3;
  private static readonly BACKOFF_MS = 1000;

  static async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        await this.wait(attempt);
      }
    }

    if (fallback) {
      return await fallback();
    }
    
    throw lastError;
  }

  private static wait(attempt: number): Promise<void> {
    return new Promise(resolve => 
      setTimeout(resolve, this.BACKOFF_MS * Math.pow(2, attempt))
    );
  }
}