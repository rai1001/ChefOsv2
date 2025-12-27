import { atom, useAtom } from 'jotai';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import { RegisterStockMovementUseCase, RegisterStockMovementDTO } from '@/application/use-cases/inventory/RegisterStockMovementUseCase';
import { GetInventoryStatusUseCase } from '@/application/use-cases/inventory/GetInventoryStatusUseCase';
import { PerformAuditUseCase } from '@/application/use-cases/inventory/PerformAuditUseCase';
import { Unit } from '@/domain/types';

// Atoms
// We might not need global atoms for transactions of specific items unless we want to cache them.
// For now, local state in components or transient fetching is fine.
export const inventoryLoadingAtom = atom<boolean>(false);
export const inventoryErrorAtom = atom<string | null>(null);

// Hook
export function useInventory() {
    const [loading, setLoading] = useAtom(inventoryLoadingAtom);
    const [error, setError] = useAtom(inventoryErrorAtom);

    const registerMovement = async (data: RegisterStockMovementDTO) => {
        setLoading(true);
        try {
            const useCase = container.get<RegisterStockMovementUseCase>(TYPES.RegisterStockMovementUseCase);
            await useCase.execute(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const performAudit = async (ingredientId: string, measuredQuantity: number, performedBy: string, ingredientName: string, unit: Unit) => {
        setLoading(true);
        try {
            const useCase = container.get<PerformAuditUseCase>(TYPES.PerformAuditUseCase);
            await useCase.execute(ingredientId, measuredQuantity, performedBy, ingredientName, unit);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getStatus = async (ingredientId: string) => {
        setLoading(true);
        try {
            const useCase = container.get<GetInventoryStatusUseCase>(TYPES.GetInventoryStatusUseCase);
            const data = await useCase.execute(ingredientId);
            setError(null);
            return data;
        } catch (err: any) {
            setError(err.message);
            throw err; // Let component handle or logging
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        registerMovement,
        performAudit,
        getStatus
    };
}
