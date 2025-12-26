import { useState, useCallback, useEffect } from 'react';
import { container } from '../di/Container';
import { TYPES } from '../di/types';
import { GetIngredientsUseCase } from '../use-cases/ingredients/GetIngredientsUseCase';
import { CreateIngredientUseCase } from '../use-cases/ingredients/CreateIngredientUseCase';
import { UpdateIngredientUseCase } from '../use-cases/ingredients/UpdateIngredientUseCase';
import { DeleteIngredientUseCase } from '../use-cases/ingredients/DeleteIngredientUseCase';
import { Ingredient } from '../../domain/entities/Ingredient';

export function useIngredients(outletId?: string) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Resolve Use Cases (assuming singleton container)
  // We get them here to ensure we have access to the DI container
  const getIngredientsUseCase = container.get<GetIngredientsUseCase>(TYPES.GetIngredientsUseCase);
  const createIngredientUseCase = container.get<CreateIngredientUseCase>(TYPES.CreateIngredientUseCase);
  const updateIngredientUseCase = container.get<UpdateIngredientUseCase>(TYPES.UpdateIngredientUseCase);
  const deleteIngredientUseCase = container.get<DeleteIngredientUseCase>(TYPES.DeleteIngredientUseCase);

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIngredientsUseCase.execute(outletId || '');
      setIngredients(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [outletId, getIngredientsUseCase]);

  // Initial Fetch
  useEffect(() => {
    fetchIngredients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount, or when outletId changes if included (fetchIngredients depends on it)

  const addIngredient = async (ingredient: Ingredient) => {
    try {
      await createIngredientUseCase.execute(ingredient);
      // Optimistic or Refresh
      await fetchIngredients();
    } catch (err) {
      console.error("Error creating ingredient:", err);
      setError(err as Error);
      throw err;
    }
  };

  const updateIngredient = async (id: string, data: Partial<Ingredient>) => {
    try {
      await updateIngredientUseCase.execute(id, data);
      await fetchIngredients();
    } catch (err) {
      console.error("Error updating ingredient:", err);
      setError(err as Error);
      throw err;
    }
  }

  const deleteIngredient = async (id: string) => {
    try {
      await deleteIngredientUseCase.execute(id);
      await fetchIngredients();
    } catch (err) {
      console.error("Error deleting ingredient:", err);
      setError(err as Error);
      throw err;
    }
  }

  return { ingredients, loading, error, addIngredient, updateIngredient, deleteIngredient, refresh: fetchIngredients };
}
