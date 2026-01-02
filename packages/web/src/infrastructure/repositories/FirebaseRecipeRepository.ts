import { injectable } from 'inversify';
import {
  getCollection,
  getDocumentById,
  setDocument,
  updateDocument,
  deleteDocument,
} from '@/services/firestoreService';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { Recipe } from '@/domain/entities/Recipe';

@injectable()
export class FirebaseRecipeRepository implements IRecipeRepository {
  private collectionName = 'recipes';

  async getRecipes(outletId?: string): Promise<Recipe[]> {
    const recipes = await getCollection<any>(this.collectionName);
    const filtered = outletId ? recipes.filter((r) => r.outletId === outletId) : recipes;

    return filtered.map((data) => this.mapDataToRecipe(data.id, data));
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    const data = await getDocumentById<any>(this.collectionName, id);
    if (!data) return null;
    return this.mapDataToRecipe(id, data);
  }

  async createRecipe(recipe: Recipe): Promise<void> {
    await setDocument(this.collectionName, recipe.id, recipe as any);
  }

  async updateRecipe(id: string, recipe: Partial<Recipe>): Promise<void> {
    await updateDocument(this.collectionName, id, recipe as any);
  }

  async deleteRecipe(id: string): Promise<void> {
    await deleteDocument(this.collectionName, id);
  }

  async searchRecipes(queryStr: string, outletId?: string): Promise<Recipe[]> {
    // Basic implementation fetching all and filtering in memory for now as Firestore full-text search is limited
    const allRecipes = await this.getRecipes(outletId);
    const lowerQuery = queryStr.toLowerCase();
    return allRecipes.filter((r) => r.name.toLowerCase().includes(lowerQuery));
  }

  private mapDataToRecipe(id: string, data: any): Recipe {
    return new Recipe(
      id,
      data.name,
      data.description,
      data.category,
      data.subCategory,
      data.servings,
      data.yieldQuantity,
      data.yieldUnit,
      data.prepTime,
      data.cookTime,
      data.ingredients || [],
      data.instructions || [],
      data.laborCost,
      data.packagingCost,
      data.sellingPrice,
      data.targetCostPercent,
      data.totalCost,
      data.costPerServing,
      data.foodCostPercent,
      data.grossMargin,
      data.outletId,
      data.imageUrl,
      data.videoUrl,
      data.allergens,
      data.tags,
      data.createdAt,
      data.updatedAt
    );
  }
}
