
import { container } from '@/application/di/Container';

export function useInjection<T>(id: any): T {
    return container.get<T>(id);
}
