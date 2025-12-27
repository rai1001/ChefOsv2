import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import { v4 as uuidv4 } from "uuid";

/**
 * Normalizes string for key mapping.
 */
const normalize = (str: string) => str?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || '';

export const aiSmartImporter = onObjectFinalized("universal_imports/{uid}/{fileId}", async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;

    const pathParts = filePath.split('/');
    const uid = pathParts[1];
    const fileId = pathParts[2];

    const db = admin.firestore();
    const jobRef = db.collection("import_jobs").doc(fileId);

    try {
        await jobRef.set({
            uid,
            status: "processing",
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            fileName: filePath.split('/').pop(),
            type: 'AI_OCR'
        });

        const bucket = admin.storage().bucket(fileBucket);
        const [content] = await bucket.file(filePath).download();
        const base64Data = content.toString('base64');
        const mimeType = event.data.contentType || 'application/pdf';

        // 2. Initialize Vertex AI
        const vertexAI = new VertexAI({ project: process.env.GCLOUD_PROJECT || 'culinaryos-6794e', location: 'us-central1' });
        const generativeModel = vertexAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
        });

        const prompt = `
            Actúa como un experto en gestión de cocinas y digitalización de datos.
            Analiza el documento adjunto (puede ser una lista de precios, una factura, una receta escrita a mano o un inventario).
            Extrae todos los INGREDIENTES y RECETAS que encuentres.
            
            Formato de salida esperado (JSON estrictamente):
            {
                "ingredients": [
                    { "name": "Nombre", "unit": "kg/l/un", "price": 0.0 }
                ],
                "recipes": [
                    { 
                        "name": "Nombre Receta", 
                        "ingredients": [
                            { "name": "Nombre Ingrediente", "quantity": 0.0 }
                        ]
                    }
                ]
            }
            
            Reglas:
            - Si no hay precio, usa 0.0.
            - Si no hay unidad clara, usa "un" o "kg".
            - Normaliza los nombres de los ingredientes.
            - Solo retorna el JSON, nada de texto extra.
        `;

        const result = await generativeModel.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: 'application/json'
            } as any
        });

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("No response from AI");

        const data = JSON.parse(responseText);
        const ingredientsMap = new Map<string, any>();
        const recipesMap = new Map<string, any>();

        // Process AI Ingredients
        (data.ingredients || []).forEach((ing: any) => {
            const key = normalize(ing.name);
            ingredientsMap.set(key, {
                id: uuidv4(),
                name: ing.name.trim(),
                unit: ing.unit || 'kg',
                costPerUnit: ing.price || 0,
                yield: 1,
                outletId: "GLOBAL",
                isTrackedInInventory: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        // Process AI Recipes + Auto-create missing ingredients
        (data.recipes || []).forEach((rec: any) => {
            const recipeIngredients: any[] = [];
            (rec.ingredients || []).forEach((item: any) => {
                const key = normalize(item.name);
                if (!ingredientsMap.has(key)) {
                    ingredientsMap.set(key, {
                        id: uuidv4(),
                        name: item.name.trim(),
                        unit: 'kg',
                        costPerUnit: 0,
                        yield: 1,
                        outletId: "GLOBAL",
                        isTrackedInInventory: false,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                const ingData = ingredientsMap.get(key);
                recipeIngredients.push({
                    ingredientId: ingData.id,
                    quantity: item.quantity || 0
                });
            });

            if (recipeIngredients.length > 0) {
                recipesMap.set(normalize(rec.name), {
                    id: uuidv4(),
                    name: rec.name,
                    ingredients: recipeIngredients,
                    outletId: "GLOBAL",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });

        // Save to Firestore in Batches
        const BATCH_SIZE = 500;

        const allIngredients = Array.from(ingredientsMap.values());
        for (let i = 0; i < allIngredients.length; i += BATCH_SIZE) {
            const batch = db.batch();
            allIngredients.slice(i, i + BATCH_SIZE).forEach(ing => {
                batch.set(db.collection("ingredients").doc(ing.id), ing);
            });
            await batch.commit();
        }

        const allRecipes = Array.from(recipesMap.values());
        for (let i = 0; i < allRecipes.length; i += BATCH_SIZE) {
            const batch = db.batch();
            allRecipes.slice(i, i + BATCH_SIZE).forEach(rec => {
                batch.set(db.collection("recipes").doc(rec.id), rec);
            });
            await batch.commit();
        }

        await jobRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            summary: {
                ingredientsFound: ingredientsMap.size,
                recipesFound: recipesMap.size
            }
        });

    } catch (error: any) {
        console.error("AI Smart Import Error:", error);
        await jobRef.update({
            status: "failed",
            error: error.message,
            failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
