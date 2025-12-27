import * as functions from "firebase-functions";
import { enrichIngredientWithAI } from "../utils/ai";

export const enrichIngredientCallable = functions.https.onCall(async (request) => {
    if (!request.data.name) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with an ingredient 'name'.");
    }

    const result = await enrichIngredientWithAI(request.data.name);
    return result;
});
