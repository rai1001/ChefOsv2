import { injectable } from 'inversify';
import { db } from '@/config/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { IRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { Recipe } from '@/domain/entities/Recipe';

@injectable()
export class FirebaseRecipeRepository implements IRecipeRepository {
    private collectionName = 'recipes';

    async getRecipes(outletId?: string): Promise<Recipe[]> {
        const q = outletId ? query(collection(db, this.collectionName), where('outletId', '==', outletId)) : collection(db, this.collectionName);
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return this.mapDataToRecipe(doc.id, data);
        });
    }

    async getRecipeById(id: string): Promise<Recipe | null> {
        const docRef = doc(db, this.collectionName, id);
        const snapshot = await getDoc(docRef);

        if (!snapshot.exists()) return null;

        return this.mapDataToRecipe(snapshot.id, snapshot.data());
    }

    async createRecipe(recipe: Recipe): Promise<void> {
        const data = { ...recipe };
        const sanitizedData = this.sanitizeData(data);
        await setDoc(doc(db, this.collectionName, recipe.id), sanitizedData);
    }

    async updateRecipe(id: string, recipe: Partial<Recipe>): Promise<void> {
        const data: any = { ...recipe, updatedAt: new Date().toISOString() };
        const sanitizedData = this.sanitizeData(data);
        await updateDoc(doc(db, this.collectionName, id), sanitizedData);
    }

    async deleteRecipe(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }

    async searchRecipes(queryStr: string, outletId?: string): Promise<Recipe[]> {
        // Basic implementation fetching all and filtering in memory for now as Firestore full-text search is limited
        const allRecipes = await this.getRecipes(outletId);
        const lowerQuery = queryStr.toLowerCase();
        return allRecipes.filter(r => r.name.toLowerCase().includes(lowerQuery));
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

    private sanitizeData(data: any): any {
        return JSON.parse(JSON.stringify(data, (_key, value) => {
            return value === undefined ? null : value;
        }));
    }
}
