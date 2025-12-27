import type { AppState } from "@/presentation/store/types";
import type { AppNotification } from "@/types";
import type { Ingredient } from "@/types";

export const reorderService = {
    /**
     * Checks if an ingredient needs a reorder and adds a notification if it does.
     */
    checkAndNotify: (state: AppState, ingredientId: string) => {
        const ingredient = state.ingredients.find((i: Ingredient) => i.id === ingredientId);
        if (!ingredient) return;

        const currentStock = ingredient.stock || 0;
        const reorderPoint = ingredient.reorderPoint || 0;

        if (reorderPoint > 0 && currentStock <= reorderPoint) {
            // Check if alert already exists for today to avoid spam
            const today = new Date().toISOString().split('T')[0];
            const existingAlert = state.notifications.find((n: AppNotification) =>
                n.type === 'SYSTEM' &&
                n.message.includes(ingredient.name) &&
                (n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp).startsWith(today)
            );

            if (!existingAlert) {
                const newNotification: AppNotification = {
                    id: crypto.randomUUID(),
                    message: `CRITICAL: Stock de ${ingredient.name} bajo (${currentStock} ${ingredient.unit}). Reorder Point: ${reorderPoint}.`,
                    type: 'SYSTEM',
                    timestamp: new Date().toISOString(),
                    read: false,
                    outletId: state.activeOutletId || undefined
                };
                state.addNotification(newNotification);
            }
        }
    }
};
