import * as tf from '@tensorflow/tfjs/dist/tf';

export class MemoryManager {
  private static readonly MEMORY_THRESHOLD = 0.7; // 70% of available memory
  private static instance: MemoryManager;

  private constructor() {
    this.setupMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private setupMemoryMonitoring(): void {
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  private async checkMemoryUsage(): Promise<void> {
    const memoryInfo = await tf.memory();
    const memoryUsageRatio = memoryInfo.numTensors / memoryInfo.numDataBuffers;

    if (memoryUsageRatio > this.MEMORY_THRESHOLD) {
      console.warn('High memory usage detected, cleaning up...');
      await this.cleanup();
    }
  }

  async cleanup(): Promise<void> {
    // Dispose of unused tensors
    tf.tidy(() => {});
    
    // Force garbage collection of tensors
    tf.dispose();

    // Clear backend state
    await tf.backend().memory().dispose();
  }

  async withMemoryManagement<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await tf.tidy(() => operation());
    } finally {
      await this.checkMemoryUsage();
    }
  }
}