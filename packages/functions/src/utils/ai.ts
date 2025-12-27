import { VertexAI } from "@google-cloud/vertexai";

export interface EnrichmentResult {
    nutritionalInfo: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    allergens: string[];
}

export async function enrichIngredientWithAI(name: string): Promise<EnrichmentResult | null> {
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        console.error("GCLOUD_PROJECT not set");
        return null;
    }

    const vertexAI = new VertexAI({ project: projectId, location: "europe-west1" });
    const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Provide nutritional information and common allergens for the ingredient: "${name}".
      Return ONLY valid JSON.
      Format:
      {
        "nutritionalInfo": { "calories": number, "protein": number, "carbs": number, "fat": number },
        "allergens": string[]
      }
      Values should be per 100g/ml.
      If unknown, return null for values but try to estimate if possible.
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.candidates?.[0].content.parts[0].text;

        if (text) {
            // Robust JSON extraction
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return data as EnrichmentResult;
            }
        }
    } catch (error) {
        console.error("Enrichment AI Error:", error);
    }
    return null;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        console.error("GCLOUD_PROJECT not set");
        return null;
    }

    const vertexAI = new VertexAI({ project: projectId, location: "europe-west1" });
    const model = vertexAI.getGenerativeModel({ model: "text-embedding-004" });

    try {
        const result = await (model as any).embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Embedding generation failed", error);
        return null;
    }
}
