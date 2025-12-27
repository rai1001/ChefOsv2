import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";
import { addDays, isBefore, parseISO } from "date-fns";

interface DemandPredictionData {
    outletId?: string;
    windowDays?: number;
    events?: any[];
    currentStock?: any[];
}

/**
 * Aggregates forecasting context from Firestore.
 */
async function aggregateForecastContext(outletId: string, windowDays: number = 14) {
    const db = admin.firestore();
    const now = new Date();
    const windowEnd = addDays(now, windowDays);
    const windowStart = addDays(now, -30); // 30 days history

    // Fetch data
    const [ingredientsSnap, eventsSnap, recipesSnap, menusSnap, wasteSnap] = await Promise.all([
        db.collection("ingredients").where("outletId", "==", outletId).get(),
        db.collection("events").where("outletId", "==", outletId).get(),
        db.collection("recipes").where("outletId", "==", outletId).get(),
        db.collection("menus").where("outletId", "==", outletId).get(),
        db.collection("waste_records").where("outletId", "==", outletId).get()
    ]);

    const recipes = recipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const menus = menusSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const recipeMap = new Map<string, any>(recipes.map(r => [r.id, r]));
    const menuMap = new Map<string, any>(menus.map(m => [m.id, m]));

    const demand: Record<string, { neededQuantity: number; eventCount: number }> = {};
    const consumption: Record<string, { totalWaste: number; avgDaily: number }> = {};

    // Future Demand
    eventsSnap.docs.forEach(doc => {
        const event = doc.data();
        const eventDate = typeof event.date === 'string' ? parseISO(event.date) : event.date.toDate();
        if (isBefore(eventDate, now)) return;
        if (!isBefore(eventDate, windowEnd)) return;

        if (!event.menuId) return;
        const menu = menuMap.get(event.menuId);
        if (!menu || !menu.recipeIds) return;

        menu.recipeIds.forEach((recipeId: string) => {
            const recipe = recipeMap.get(recipeId);
            if (!recipe) return;

            recipe.ingredients.forEach((ri: any) => {
                if (!demand[ri.ingredientId]) {
                    demand[ri.ingredientId] = { neededQuantity: 0, eventCount: 0 };
                }
                demand[ri.ingredientId].neededQuantity += (ri.quantity * (event.pax || 0));
                demand[ri.ingredientId].eventCount += 1;
            });
        });
    });

    // History
    wasteSnap.docs.forEach(doc => {
        const record = doc.data();
        const recordDate = typeof record.date === 'string' ? parseISO(record.date) : record.date.toDate();
        if (!isBefore(windowStart, recordDate)) return;

        if (!consumption[record.ingredientId]) {
            consumption[record.ingredientId] = { totalWaste: 0, avgDaily: 0 };
        }
        consumption[record.ingredientId].totalWaste += (record.quantity || 0);
    });

    // Consolidate
    return ingredientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })).map((ing: any) => {
        const d = demand[ing.id] || { neededQuantity: 0, eventCount: 0 };
        const h = consumption[ing.id] || { totalWaste: 0, avgDaily: 0 };
        return {
            ingredientId: ing.id,
            ingredientName: ing.name,
            currentStock: ing.stock || 0,
            unit: ing.unit,
            futureDemand: d,
            historicalUsage: h
        };
    }).filter(item => item.futureDemand.neededQuantity > 0 || item.historicalUsage.totalWaste > 0);
}

export const predictDemand = functions.https.onCall(async (data: DemandPredictionData, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated.");
    }

    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        throw new functions.https.HttpsError("failed-precondition", "Missing PROJECT_ID.");
    }

    let forecastContext: any = data.events && data.currentStock ? { events: data.events, currentStock: data.currentStock } : null;

    if (!forecastContext && data.outletId) {
        forecastContext = await aggregateForecastContext(data.outletId, data.windowDays);
    }

    if (!forecastContext) {
        throw new functions.https.HttpsError("invalid-argument", "Must provide either data or outletId.");
    }

    const vertexAI = new VertexAI({ project: projectId, location: "us-central1" }); // Standardize to us-central1
    const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Actúa como un Jefe de Compras experto. 
    Analiza el siguiente contexto de previsión (demanda futura y mermas históricas) para generar una lista de compra sugerida.
    
    Contexto:
    ${JSON.stringify(forecastContext, null, 2)}
    
    INSTRUCCIONES:
    1. Para cada ingrediente, calcula la cantidad a comprar basándote en la demanda futura (+10% seguridad) vs stock actual.
    2. Si no hay necesidad real, no lo incluyas.
    3. Clasifica como 'CRITICAL' si el stock no cubre la demanda de los próximos eventos, o 'PLANNING' si es para mantener stock óptimo.
    4. Devuelve UNICAMENTE un objeto JSON:
    { 
      "suggestions": [
        { 
          "ingredientId": "string",
          "ingredientName": "string", 
          "quantityToBuy": number, 
          "unit": "string", 
          "reason": "breve explicación en español", 
          "priority": "CRITICAL" | "PLANNING" 
        }
      ],
      "summary": "Resumen ejecutivo de la situación de compra" 
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.candidates?.[0].content.parts[0].text;
        if (!text) throw new Error("No response from AI");

        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Prediction Error:", error);
        throw new functions.https.HttpsError("internal", "Prediction failed");
    }
});
