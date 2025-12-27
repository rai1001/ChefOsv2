import * as functions from "firebase-functions";
import { enrichIngredientWithAI } from "../utils/ai";

export const enrichIngredient = functions.firestore
    .document("ingredients/{ingredientId}")
    .onCreate(async (snap, context) => {
        const ingredient = snap.data();

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
