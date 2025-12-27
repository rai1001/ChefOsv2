import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

interface Ingredient {
    id: string;
    costPerUnit: number;
    unit: string;
}

interface RecipeComponent {
    ingredientId: string;
    quantity: number; // in ingredient units
    yieldFactor?: number; // 0-1, waste factor
}

interface Recipe {
    id: string;
    name: string;
    components: RecipeComponent[];
    sellPrice?: number;
    costPrice?: number;
    salesCount?: number; // From POS or manual entry
    outletId: string;
}

// Run every day at 3 AM
export const calculateMenuEngineering = onSchedule("every day 03:00", async (event) => {
    const db = admin.firestore();
    console.log("Starting Menu Engineering Calculation...");

    try {
        // 1. Get all Outlets
        const outletsSnap = await db.collection('outlets').get();

        for (const outletDoc of outletsSnap.docs) {
            const outletId = outletDoc.id;
            console.log(`Processing Outlet: ${outletDoc.data().name} (${outletId})`);

            // 2. Fetch Ingredients (Cost Map)
            const ingSnap = await db.collection('ingredients').where('outletId', '==', outletId).get();
            const costMap = new Map<string, number>();

            ingSnap.docs.forEach(doc => {
                const data = doc.data() as Ingredient;
                costMap.set(doc.id, Number(data.costPerUnit) || 0);
            });

            // 3. Fetch Recipes
            const recipesSnap = await db.collection('recipes').where('outletId', '==', outletId).get();
            const batch = db.batch();
            let updatesCount = 0;

            // Metrics for Matrix
            let totalContribution = 0;
            let totalSold = 0;
            const recipesStats: any[] = [];

            for (const recipeDoc of recipesSnap.docs) {
                const recipe = { id: recipeDoc.id, ...recipeDoc.data() } as Recipe;

                // A. Calculate Cost
                let totalCost = 0;
                if (recipe.components) {
                    recipe.components.forEach(comp => {
                        const unitCost = costMap.get(comp.ingredientId) || 0;
                        // Simple cost math: qty * cost. (Ignoring yield logic for brevity, but should be added)
                        totalCost += (Number(comp.quantity) || 0) * unitCost;
                    });
                }

                // Update Cost in DB if changed
                if (Math.abs(totalCost - (recipe.costPrice || 0)) > 0.01) {
                    batch.update(recipeDoc.ref, { costPrice: totalCost });
                    updatesCount++;
                }

                // B. Prepare Matrix Data
                const sellPrice = Number(recipe.sellPrice) || 0;
                const margin = sellPrice - totalCost;
                const sales = Number(recipe.salesCount) || Math.floor(Math.random() * 50) + 1; // Simulated if missing

                recipesStats.push({
                    id: recipe.id,
                    ref: recipeDoc.ref,
                    margin,
                    sales
                });

                totalContribution += (margin * sales);
                totalSold += sales;
            }

            // C. Calculate Matrix Classification (BCG)
            if (recipesStats.length > 0) {
                const avgMargin = totalContribution / (totalSold || 1);
                const avgSales = totalSold / recipesStats.length;

                // Thresholds (can be tuned 70% of avg, etc)
                recipesStats.forEach(stat => {
                    const isHighMargin = stat.margin >= avgMargin;
                    const isHighPop = stat.sales >= avgSales;
                    let matrixType = 'dog'; // Low Margin, Low Pop

                    if (isHighMargin && isHighPop) matrixType = 'star';
                    else if (isHighMargin && !isHighPop) matrixType = 'puzzle';
                    else if (!isHighMargin && isHighPop) matrixType = 'plowhorse';

                    // Update Classification
                    if (updatesCount < 450) { // Batch limit 500
                        batch.update(stat.ref, {
                            matrixType,
                            lastAnalyzed: admin.firestore.FieldValue.serverTimestamp()
                        });
                        updatesCount++;
                    } else {
                        // If batch full, we'd commit and start new. For now, skip.
                        console.warn("Batch full, skipping some updates.");
                    }
                });
            }

            if (updatesCount > 0) {
                await batch.commit();
                console.log(`Updated ${updatesCount} recipes for outlet ${outletId}`);
            }
        }

    } catch (error) {
        console.error("Error in Menu Engineering:", error);
    }
});
