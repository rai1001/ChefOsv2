import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const getMenuAnalytics = onCall(async (request) => {
    // 1. Auth check
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const { startDate, endDate, outletId } = request.data;
    if (!startDate || !endDate) {
        throw new HttpsError("invalid-argument", "startDate and endDate are required.");
    }

    const db = admin.firestore();

    try {
        // 2. Fetch Data
        let eventsQuery: admin.firestore.Query = db.collection("events")
            .where("date", ">=", startDate)
            .where("date", "<=", endDate);

        if (outletId) {
            eventsQuery = eventsQuery.where("outletId", "==", outletId);
        }

        const [eventsSnap, menusSnap, recipesSnap] = await Promise.all([
            eventsQuery.get(),
            db.collection("menus").get(),
            db.collection("recipes").get()
        ]);

        const menus = new Map(menusSnap.docs.map(doc => [doc.id, doc.data()]));
        const recipes = new Map(recipesSnap.docs.map(doc => [doc.id, doc.data()]));

        const statsMap = new Map<string, {
            totalOrders: number;
            totalRevenue: number;
            totalProfit: number;
            lastOrdered: string;
            recipeName: string;
        }>();

        // 3. Aggregate Stats
        eventsSnap.forEach((doc) => {
            const event = doc.data();
            if (!event.menuId) return;

            const menu: any = menus.get(event.menuId);
            if (!menu || !menu.recipeIds) return;

            const recipesInMenu = menu.recipeIds.map((rid: string) => ({
                id: rid,
                data: recipes.get(rid)
            })).filter((r: any) => r.data);

            const pricePerDish = (menu.sellPrice || 0) / (recipesInMenu.length || 1);

            recipesInMenu.forEach((r: any) => {
                const current = statsMap.get(r.id) || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalProfit: 0,
                    lastOrdered: event.date,
                    recipeName: r.data.name || "Receta Desconocida"
                };

                const costPerServing = r.data.totalCost || 0;
                const profitPerServing = pricePerDish - costPerServing;

                statsMap.set(r.id, {
                    totalOrders: current.totalOrders + (event.pax || 0),
                    totalRevenue: current.totalRevenue + (pricePerDish * (event.pax || 0)),
                    totalProfit: current.totalProfit + (profitPerServing * (event.pax || 0)),
                    lastOrdered: event.date > current.lastOrdered ? event.date : current.lastOrdered,
                    recipeName: current.recipeName
                });
            });
        });

        // 4. Transform and Classify
        const results = Array.from(statsMap.entries()).map(([recipeId, stats]) => ({
            recipeId,
            recipeName: stats.recipeName,
            totalRevenue: stats.totalRevenue,
            totalOrders: stats.totalOrders,
            avgProfitPerServing: stats.totalOrders > 0 ? stats.totalProfit / stats.totalOrders : 0,
            totalProfit: stats.totalProfit,
            lastOrdered: stats.lastOrdered,
            popularityScore: 0,
            profitabilityScore: 0,
            classification: "dog"
        }));

        if (results.length === 0) return [];

        const maxOrders = Math.max(...results.map(r => r.totalOrders));
        const avgProfit = results.reduce((acc, r) => acc + r.avgProfitPerServing, 0) / results.length;

        return results.map(r => {
            const popularity = r.totalOrders / (maxOrders || 1);
            const profitability = r.avgProfitPerServing >= avgProfit ? 1 : 0.4;

            let classification = "dog";
            if (popularity >= 0.7 && profitability === 1) classification = "star";
            else if (popularity >= 0.7 && profitability < 1) classification = "cash-cow";
            else if (popularity < 0.7 && profitability === 1) classification = "puzzle";

            return {
                ...r,
                popularityScore: popularity,
                profitabilityScore: profitability,
                classification
            };
        });

    } catch (error: any) {
        console.error("Error in getMenuAnalytics:", error);
        throw new HttpsError("internal", error.message);
    }
});
