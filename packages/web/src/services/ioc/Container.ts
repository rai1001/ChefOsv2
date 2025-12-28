import type { IDatabaseService } from '../ports/IDatabaseService';
import type { IAIService } from '../../domain/interfaces/services/IAIService';

interface ServiceMap {
  database: IDatabaseService;
  ai: IAIService;
}

class Container {
  private services: Partial<ServiceMap> = {};

  register<K extends keyof ServiceMap>(key: K, instance: ServiceMap[K]): void {
    this.services[key] = instance;
  }

  resolve<K extends keyof ServiceMap>(key: K): ServiceMap[K] {
    const service = this.services[key];
    if (!service) {
      throw new Error(`Service not found: ${String(key)}`);
    }
    return service;
  }
}

export const container = new Container();

// Service Keys
export const SERVICE_KEYS = {
  DATABASE: 'database' as const,
  AI: 'ai' as const,
};

// Bootstrap function to initialize the container with preferred adapters
import { FirebaseAdapter } from '../adapters/FirebaseAdapter';
import { GeminiAdapter } from '../adapters/GeminiAdapter';

export function bootstrap() {
  container.register(SERVICE_KEYS.DATABASE, new FirebaseAdapter());
  container.register(SERVICE_KEYS.AI, new GeminiAdapter());
}
