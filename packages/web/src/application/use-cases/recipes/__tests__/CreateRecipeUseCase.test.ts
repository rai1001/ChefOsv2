import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateRecipeUseCase } from '../CreateRecipeUseCase';
import { Recipe } from '@/domain/entities/Recipe';

describe('CreateRecipeUseCase', () => {
    let useCase: CreateRecipeUseCase;
    let mockRepository: any;
    let mockCalculateCost: any;

    beforeEach(() => {
        mockRepository = {
            createRecipe: vi.fn(),
        };
        mockCalculateCost = {
            execute: vi.fn(),
        };
        useCase = new CreateRecipeUseCase(mockRepository, mockCalculateCost);
    });

    it('should create recipe and calculate cost', async () => {
        const recipe: Recipe = {
            id: '123',
            name: 'Test Recipe',
            ingredients: []
        } as any;

        await useCase.execute(recipe);

        expect(mockRepository.createRecipe).toHaveBeenCalledWith(recipe);
        expect(mockCalculateCost.execute).toHaveBeenCalledWith('123');
    });
});
