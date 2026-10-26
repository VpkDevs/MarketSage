/**
 * Shared method decorators.
 *
 * AsyncErrorHandler wraps an async method so a rejection is logged through
 * the app ErrorHandler instead of propagating as an unhandled rejection.
 * Callers that need a sentinel value on failure pass it as the fallback:
 *
 *   @AsyncErrorHandler({ isValid: false, errors: ['Authentication failed'] })
 *   async login(...) { ... }
 *
 * On error the wrapped method resolves to the fallback (or undefined when
 * no fallback was given).
 */
import { ErrorHandler } from '../errors/ErrorHandler';

// The factory returns `any` on purpose: TypeScript's legacy-decorator
// signature resolution rejects concretely-typed descriptor factories
// whose return type does not mirror every decorated method's signature.
// The wrapping logic itself is fully typed internally.
export function AsyncErrorHandler(fallback?: unknown): any {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const original = descriptor.value;
    if (typeof original !== 'function') {
      return descriptor;
    }

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await original.apply(this, args);
      } catch (error) {
        ErrorHandler.getInstance().handleError(
          error instanceof Error ? error : new Error(String(error)),
          {
            method: String(propertyKey),
            class: (target as object).constructor?.name
          }
        );
        return fallback;
      }
    };

    return descriptor;
  };
}
