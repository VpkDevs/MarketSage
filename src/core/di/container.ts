/**
 * Dependency Injection Container
 * Provides centralized service instantiation and management
 */

interface ServiceConstructor<T = {}> {
  new (...args: any[]): T;
}

export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a service in the container
   */
  register<T>(name: string, constructor: ServiceConstructor<T>, singleton = true): void {
    if (singleton) {
      this.singletons.set(name, constructor);
    } else {
      this.services.set(name, constructor);
    }
  }

  /**
   * Get a service instance from the container
   */
  get<T>(name: string): T {
    // Check if it's a singleton and already instantiated
    if (this.singletons.has(name)) {
      if (!this.services.has(name)) {
        const Constructor = this.singletons.get(name);
        this.services.set(name, new Constructor());
      }
      return this.services.get(name);
    }

    // Create new instance for non-singletons
    const Constructor = this.services.get(name);
    if (!Constructor) {
      throw new Error(`Service ${name} not registered`);
    }
    return new Constructor();
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.singletons.has(name);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}
