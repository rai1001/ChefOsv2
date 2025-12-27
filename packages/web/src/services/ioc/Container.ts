// type Constructor removed as it was unused

class Container {
    private services = new Map<string, any>();

    register<T>(key: string, instance: T): void {
        this.services.set(key, instance);
    }

    resolve<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service not found: ${key}`);
        }
        return service;
    }
}

export const container = new Container();

// Service Keys
export const SERVICE_KEYS = {
    DATABASE: 'database',
    AI: 'ai',
};

// Bootstrap function to initialize the container with preferred adapters
import { FirebaseAdapter } from '../adapters/FirebaseAdapter';
import { GeminiAdapter } from '../adapters/GeminiAdapter';

export function bootstrap() {
    container.register(SERVICE_KEYS.DATABASE, new FirebaseAdapter());
    container.register(SERVICE_KEYS.AI, new GeminiAdapter());
}
