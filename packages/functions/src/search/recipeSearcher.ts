import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { generateEmbedding } from "../utils/ai";

interface SearchData {
    query: string;
}

export const searchRecipes = onCall(async (request: CallableRequest<SearchData>) => {
    const query = request.data.query;
    if (!query) {
        throw new HttpsError("invalid-argument", "The function must be called with a 'query' string.");
    }

    const embedding = await generateEmbedding(query);
    if (!embedding) {
        throw new HttpsError("internal", "Failed to generate embedding.");
    }

    try {
        const collection = admin.firestore().collection("recipes");

        // Use Firestore Vector Search (requires index)
        const vectorQuery = collection.findNearest({
            vectorField: "_embedding",
            queryVector: embedding,
            limit: 10,
            distanceMeasure: "COSINE"
        });

        const snapshot = await vectorQuery.get();

        const recipes = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
            id: doc.id,
            ...doc.data()
        }));

        return { recipes };
    } catch (error) {
        console.error("Vector Search Error:", error);
        throw new HttpsError("internal", "Search failed.", error);
    }
});
