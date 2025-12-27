import type { IngredientSupplierConfig, SupplierOption } from '@/types/suppliers';

// Mock DB fetch - in real app would use firestoreService
const mockConfigs = new Map<string, IngredientSupplierConfig>();

export const supplierSelectionService = {
    getIngredientSuppliers: async (ingredientId: string): Promise<IngredientSupplierConfig | null> => {
        // In e2e/production this would fetch from Firestore collection 'ingredient_suppliers'
        return mockConfigs.get(ingredientId) || null;
    },

    saveIngredientSuppliers: async (config: IngredientSupplierConfig): Promise<void> => {
        mockConfigs.set(config.ingredientId, config);
        // await firestoreService.set(COLLECTIONS.INGREDIENT_SUPPLIERS, config.ingredientId, config);
    },

    selectOptimalSupplier: async (
        ingredientId: string,
        _quantityNeeded: number,
        urgency: 'normal' | 'urgent' = 'normal'
    ): Promise<SupplierOption | null> => {
        const config = await supplierSelectionService.getIngredientSuppliers(ingredientId);
        if (!config) return null;

        const available = config.suppliers.filter(s => s.isActive);
        if (available.length === 0) return null;

        // Normalize helper
        const normalize = (val: number, min: number, max: number) => {
            if (max === min) return 100;
            return ((val - min) / (max - min)) * 100;
        };

        // Calculate ranges for normalization
        const prices = available.map(s => s.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const leadTimes = available.map(s => s.leadTimeDays);
        const minLead = Math.min(...leadTimes);
        const maxLead = Math.max(...leadTimes);

        // Calculate weighted scores
        const scored = available.map(supplier => {
            const weights = config.selectionCriteria.weights;

            // Price: Lower is better. 
            // If price is min, score 100. If max, score 0.
            const priceScore = maxPrice === minPrice ? 100 : 100 - normalize(supplier.price, minPrice, maxPrice);

            // Lead Time: Lower is better.
            const leadTimeScore = maxLead === minLead ? 100 : 100 - normalize(supplier.leadTimeDays, minLead, maxLead);

            // Quality: 1-5 to 0-100
            const qualityScore = (supplier.qualityRating / 5) * 100;

            // Reliability: 0-100 direct
            const reliabScore = supplier.reliabilityScore;

            const totalScore =
                (priceScore * weights.price) +
                (qualityScore * weights.quality) +
                (reliabScore * weights.reliability) +
                (leadTimeScore * weights.leadTime);

            return { supplier, score: totalScore };
        });

        // If urgent, filter for fastest lead times or heavily penalize slow ones
        if (urgency === 'urgent') {
            // Simple strategy: Sort by lead time ASC, then by score
            scored.sort((a, b) => {
                const leadDiff = a.supplier.leadTimeDays - b.supplier.leadTimeDays;
                if (leadDiff !== 0) return leadDiff;
                return b.score - a.score;
            });
        } else {
            // Sort by Total Score DESC
            scored.sort((a, b) => b.score - a.score);
        }

        return scored[0]?.supplier || null;
    }
};
