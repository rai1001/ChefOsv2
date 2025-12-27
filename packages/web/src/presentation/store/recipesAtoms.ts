import { atom, useAtom } from 'jotai';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import { Recipe } from '@/domain/entities/Recipe';
import { GetRecipesUseCase } from '@/application/use-cases/recipes/GetRecipesUseCase';
import { CreateRecipeUseCase } from '@/application/use-cases/recipes/CreateRecipeUseCase';
import { UpdateRecipeUseCase } from '@/application/use-cases/recipes/UpdateRecipeUseCase';
import { DeleteRecipeUseCase } from '@/application/use-cases/recipes/DeleteRecipeUseCase';

// Atoms
export const recipesAtom = atom<Recipe[]>([]);
export const recipesLoadingAtom = atom<boolean>(false);
export const recipesErrorAtom = atom<string | null>(null);

// Hook
export function useRecipes() {
    const [recipes, setRecipes] = useAtom(recipesAtom);
    const [loading, setLoading] = useAtom(recipesLoadingAtom);
    const [error, setError] = useAtom(recipesErrorAtom);

    const refresh = async () => {
        setLoading(true);
        try {
            const getUseCase = container.get<GetRecipesUseCase>(TYPES.GetRecipesUseCase);
            const data = await getUseCase.execute();
            // Optional: filter by outlet if context available
            setRecipes(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addRecipe = async (recipe: Recipe) => {
        setLoading(true);
        try {
            const createUseCase = container.get<CreateRecipeUseCase>(TYPES.CreateRecipeUseCase);
            await createUseCase.execute(recipe);
            await refresh();
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
        setLoading(true);
        try {
            const updateUseCase = container.get<UpdateRecipeUseCase>(TYPES.UpdateRecipeUseCase);
            await updateUseCase.execute(id, updates);
            await refresh();
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteRecipe = async (id: string) => {
        setLoading(true);
        try {
            const deleteUseCase = container.get<DeleteRecipeUseCase>(TYPES.DeleteRecipeUseCase);
            await deleteUseCase.execute(id);
            setRecipes(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Auto-load once if empty (simple implementation)
    // In a real app, might want detailed cache control
    if (recipes.length === 0 && !loading && !error) {
        // Can't call side effect directly in render loop easily without useEffect used in component.
        // So we leave it to component to call refresh on mount.
    }

    return {
        recipes,
        loading,
        error,
        refresh,
        addRecipe,
        updateRecipe,
        deleteRecipe
    };
}
