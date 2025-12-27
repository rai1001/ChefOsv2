import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calcularCostosFicha } from './costosService';
import { firestoreService } from '@/services/firestoreService';
import { Ingredient } from '@/types';

// Mock firestoreService
vi.mock('./firestoreService', () => ({
    firestoreService: {
        getById: vi.fn(),
        query: vi.fn(),
    }
}));

describe('CostosService - calcularCostosFicha', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should calculate total cost based on ingredients and yield', async () => {
        // Mock Ingredient Data
        const mockIngredient: Ingredient = {
            id: 'ing-1',
            name: 'Harina',
            costPerUnit: 2, // 2€ / kg
            unit: 'kg',
            yield: 1 // 100% yield
        } as any;

        // Mock batch query response
        (firestoreService.query as any).mockResolvedValue([mockIngredient]);
        // Fallback mock (just in case)
        (firestoreService.getById as any).mockResolvedValue(mockIngredient);

        const fichaDTO = {
            porciones: 10,
            ingredientes: [
                { ingredienteId: 'ing-1', cantidad: 5, unidad: 'kg' } // 5kg * 2€ = 10€
            ],
            costos: {
                manoObra: 5,
                energia: 2
            }
        };

        const result = await calcularCostosFicha(fichaDTO as any);

        // Verify batch query was called
        expect(firestoreService.query).toHaveBeenCalled();

        expect(result.ingredientes).toBe(10);
        expect(result.manoObra).toBe(5);
        expect(result.energia).toBe(2);
        expect(result.total).toBe(17); // 10 + 5 + 2
        expect(result.porPorcion).toBe(1.7); // 17 / 10
    });

    it('should handle ingredient yield (mermas) correctly', async () => {
        // Ingredient with 50% yield (costs double effectively)
        const mockIngredient: Ingredient = {
            id: 'ing-2',
            name: 'Pescado',
            costPerUnit: 10,
            unit: 'kg',
            yield: 0.5
        } as any;

        (firestoreService.query as any).mockResolvedValue([mockIngredient]);
        (firestoreService.getById as any).mockResolvedValue(mockIngredient);

        const fichaDTO = {
            porciones: 1,
            ingredientes: [
                { ingredienteId: 'ing-2', cantidad: 1, unidad: 'kg' }
            ]
        };

        const result = await calcularCostosFicha(fichaDTO as any);
        expect(result.ingredientes).toBeGreaterThan(10);
    });

    it('should gracefully handle missing ingredients (not found in DB)', async () => {
        (firestoreService.query as any).mockResolvedValue([]);
        (firestoreService.getById as any).mockResolvedValue(null);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const fichaDTO = {
            ingredientes: [
                { ingredienteId: 'missing-id', cantidad: 1, unidad: 'kg' }
            ]
        };

        const result = await calcularCostosFicha(fichaDTO as any);

        expect(result.ingredientes).toBe(0);
        consoleSpy.mockRestore();
    });

    it('should calculate cost correctly with unit conversion', async () => {
         const mockIngredient: Ingredient = {
            id: 'ing-3',
            name: 'Saffron',
            costPerUnit: 10, // 10 per gram
            unit: 'g',
            yield: 1
        } as any;

        (firestoreService.query as any).mockResolvedValue([mockIngredient]);
        (firestoreService.getById as any).mockResolvedValue(mockIngredient);

        const fichaDTO = {
            ingredientes: [
                { ingredienteId: 'ing-3', cantidad: 0.001, unidad: 'kg' } // 0.001kg = 1g
            ]
        };

        const result = await calcularCostosFicha(fichaDTO as any);
        expect(result.ingredientes).toBe(10);
    });
});
