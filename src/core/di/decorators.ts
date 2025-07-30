/**
 * Service Decorators for Dependency Injection
 */

import { DIContainer } from './container';

/**
 * Decorator to mark a class as a service
 */
export function Service(name?: string) {
  return function<T extends new (...args: any[]) => {}>(constructor: T) {
    const serviceName = name || constructor.name;
    DIContainer.getInstance().register(serviceName, constructor, true);
    return constructor;
  };
}

/**
 * Decorator to inject dependencies
 */
export function Inject(serviceName: string) {
  return function(target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get() {
        return DIContainer.getInstance().get(serviceName);
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Decorator to mark a method as async with error handling
 */
export function AsyncErrorHandler(fallback?: any) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        console.error(`Error in ${target.constructor.name}.${propertyName}:`, error);
        if (fallback !== undefined) {
          return fallback;
        }
        throw error;
      }
    };
  };
}
