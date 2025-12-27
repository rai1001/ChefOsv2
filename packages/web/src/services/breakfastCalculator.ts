import type { OccupancyData, ConsumptionRatio, IngredientNeed } from '@/types/occupancy';

export async function calculateBreakfastNeeds(
    occupancyData: OccupancyData[],
    consumptionRatios: ConsumptionRatio[]
): Promise<IngredientNeed[]> {
    const needs = new Map<string, number>();
    const ingredientNames = new Map<string, string>();
    const ingredientUnits = new Map<string, string>();

    // Basic aggregation
    occupancyData.forEach(day => {
        consumptionRatios.forEach(ratio => {
            // Filter by meal type compatibility
            if (ratio.category !== 'breakfast') return;

            // Calculation: Pax * QuantityPerPax
            const quantity = day.estimatedPax * ratio.quantityPerPax;

            const current = needs.get(ratio.ingredientId) || 0;
            needs.set(ratio.ingredientId, current + quantity);

            // Store metadata
            if (!ingredientNames.has(ratio.ingredientId)) {
                ingredientNames.set(ratio.ingredientId, ratio.ingredientName);
                ingredientUnits.set(ratio.ingredientId, ratio.unit);
            }
        });
    });

    // Transform to array
    // NOTE: This aggregates TOTAL needs for the period. 
    // If we needed daily breakdown, the return type would need to be different (e.g. Map<Date, Need[]>)
    // The interface I defined `IngredientNeed` has a `date`.
    // If `occupancyData` scans multiple days, do we return one big list or a list of daily needs?
    // The interface has "date: Date". This implies granularity per date.
    // My loop above aggregates EVERYTHING into one Map (losing date info).

    // Let's re-implement to be Day-wise if the interface requires Date.
    // Actually, usually purchasing is done for a period.
    // But let's respect the type definition I made which includes `date`.
    // Wait, if I aggregate for a range, what date do I put? Today? Start Date?
    // If the requirement is "Calculate needs", usually it's "For next week". 
    // Let's change the strategy: Return daily needs OR aggregated needs with a range.
    // Given the type `IngredientNeed` has `date`, I should probably calculate daily needs.

    const dailyNeeds: IngredientNeed[] = [];

    occupancyData.forEach(day => {
        consumptionRatios.forEach(ratio => {
            if (ratio.category !== 'breakfast') return; // Only breakfast ratios

            const quantity = day.estimatedPax * ratio.quantityPerPax;

            if (quantity > 0) {
                dailyNeeds.push({
                    ingredientId: ratio.ingredientId,
                    ingredientName: ratio.ingredientName,
                    quantityNeeded: quantity,
                    unit: ratio.unit,
                    date: day.date
                });
            }
        });
    });

    return dailyNeeds;
}

// Helper to aggregate if needed
export function aggregateNeeds(dailyNeeds: IngredientNeed[]): IngredientNeed[] {
    const map = new Map<string, IngredientNeed>();

    dailyNeeds.forEach(need => {
        const existing = map.get(need.ingredientId);
        if (existing) {
            existing.quantityNeeded += need.quantityNeeded;
        } else {
            map.set(need.ingredientId, { ...need, date: new Date() }); // Date becomes "now" or irrelevant for aggregation
        }
    });

    return Array.from(map.values());
}
