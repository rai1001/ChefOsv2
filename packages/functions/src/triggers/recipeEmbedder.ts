import * as functions from "firebase-functions";
import { VertexAI } from "@google-cloud/vertexai";

export const embedRecipe = functions.firestore
    .document("recipes/{recipeId}")
    .onWrite(async (change, context) => {
        const after = change.after.data();

        // If deleted or no name, skip
        if (!after || !after.name) return null;

        // If embedding already exists and name/ingredients haven't changed meaningfully, skip (simplified check)
        // For now, always re-embed on generic update to be safe

        const projectId = process.env.GCLOUD_PROJECT;
        if (!projectId) return null;

        const vertexAI = new VertexAI({ project: projectId, location: "europe-west1" });
        const model = vertexAI.getGenerativeModel({ model: "text-embedding-004" });

        const textToEmbed = `Recipe: ${after.name}. Station: ${after.station}.`;

        try {
            // API usage for embeddings in this SDK version might require casting or specific method
            const result = await (model as any).embedContent(textToEmbed);
            const embedding = result.embedding.values;

            return change.after.ref.update({
                _embedding: embedding
            });

        } catch (error) {
            console.error("Embedding Error:", error);
        }
        return null;
    });
