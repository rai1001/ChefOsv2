import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { enrichIngredientWithAI } from "../utils/ai";

export const enrichIngredient = onDocumentCreated("ingredients/{ingredientId}", async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const ingredient = snap.data();

    if (!ingredient) return null;

    // Only enrich if name is present but nutritional info is missing
    if (!ingredient.name || ingredient.nutritionalInfo) {
        return null;
    }

    const enrichmentData = await enrichIngredientWithAI(ingredient.name);

    if (enrichmentData) {
        return snap.ref.update({
            nutritionalInfo: enrichmentData.nutritionalInfo,
            allergens: enrichmentData.allergens
        });
    }
    return null;
});
