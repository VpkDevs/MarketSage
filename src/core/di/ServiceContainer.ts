/**
 * Minimal service registry for the core layer.
 *
 * The @Service('Name') class decorator registers a class under a stable
 * name so other core modules can look it up without hard imports. (The
 * fuller DI container lives in ./container as DIContainer; this module is
 * the lightweight registry the auth provider was written against.)
 */
export class ServiceContainer {
  private static readonly services = new Map<string, unknown>();

  static register(name: string, service: unknown): void {
    ServiceContainer.services.set(name, service);
  }

  static get<T = unknown>(name: string): T | undefined {
    return ServiceContainer.services.get(name) as T | undefined;
  }

  static has(name: string): boolean {
    return ServiceContainer.services.has(name);
  }

  static unregister(name: string): void {
    ServiceContainer.services.delete(name);
  }
}

/**
 * Class decorator: register the decorated class in the ServiceContainer
 * under the given name.
 */
export function Service(name: string): ClassDecorator {
  return (target: Function) => {
    ServiceContainer.register(name, target);
  };
}
