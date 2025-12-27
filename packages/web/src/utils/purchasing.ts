import { v4 as uuidv4 } from 'uuid';
import type { Ingredient, Event, Supplier, PurchaseOrder, PurchaseOrderItem } from '@/types';

export const calculateRequirements = (events: Event[]): Map<string, { quantity: number, earliestDate: string }> => {
    const requirements = new Map<string, { quantity: number, earliestDate: string }>();

    events.forEach(event => {
        if (!event.menu?.recipes) return;

        event.menu.recipes.forEach(recipe => {
            recipe.ingredients.forEach(ri => {
                const totalQuantity = ri.quantity * event.pax;
                const current = requirements.get(ri.ingredientId);

                const eventDate = event.date;
                let earliestDate = eventDate;

                if (current) {
                    earliestDate = current.earliestDate < eventDate ? current.earliestDate : eventDate;
                    requirements.set(ri.ingredientId, {
                        quantity: current.quantity + totalQuantity,
                        earliestDate
                    });
                } else {
                    requirements.set(ri.ingredientId, {
                        quantity: totalQuantity,
                        earliestDate
                    });
                }
            });
        });
    });

    return requirements;
};

export const generateDraftOrders = (
    requirements: Map<string, { quantity: number, earliestDate: string }>,
    ingredients: Ingredient[],
    suppliers: Supplier[]
): { orders: PurchaseOrder[], warnings: string[] } => {
    const ordersBySupplier = new Map<string, { items: PurchaseOrderItem[], earliestNeeded: string }>();
    const warnings: string[] = [];

    ingredients.forEach(ingredient => {
        const req = requirements.get(ingredient.id);
        const needed = req ? req.quantity : 0;
        const earliestNeeded = req ? req.earliestDate : new Date().toISOString().split('T')[0]!;

        const currentStock = ingredient.stock || 0;
        const minStock = ingredient.minStock || 0;

        const projectedStock = currentStock - needed;

        if (projectedStock < minStock) {
            const deficit = minStock - projectedStock;
            const orderQuantity = deficit > 0 ? deficit : 0;

            if (orderQuantity > 0 && ingredient.supplierId) {
                const item: PurchaseOrderItem = {
                    ingredientId: ingredient.id,
                    quantity: parseFloat(orderQuantity.toFixed(2)),
                    unit: ingredient.unit,
                    costPerUnit: ingredient.costPerUnit || 0
                };

                const existing = ordersBySupplier.get(ingredient.supplierId) || {
                    items: [] as PurchaseOrderItem[],
                    earliestNeeded: earliestNeeded
                };
                existing.items.push(item);
                // Update earliest needed if this ingredient is needed earlier
                if (earliestNeeded && existing.earliestNeeded && earliestNeeded < existing.earliestNeeded) {
                    existing.earliestNeeded = earliestNeeded;
                }
                ordersBySupplier.set(ingredient.supplierId, existing);
            }
        }
    });

    const draftOrders: PurchaseOrder[] = [];

    ordersBySupplier.forEach((data, supplierId) => {
        const { items, earliestNeeded } = data;
        const supplier = suppliers.find(s => s.id === supplierId);
        const totalCost = items.reduce((sum, item) => sum + (item.quantity * (item.costPerUnit || 0)), 0);

        // Calculate Order Deadline
        const leadTime = supplier?.leadTime || 0;
        const needDateObj = new Date(earliestNeeded);
        needDateObj.setDate(needDateObj.getDate() - leadTime);
        const orderDeadline = needDateObj.toISOString().split('T')[0]!;

        // Check Min Order
        const minOrder = supplier?.minimumOrderValue || 0;
        if (totalCost < minOrder) {
            warnings.push(`Pedido a ${supplier?.name || 'Proveedor'} es de ${totalCost.toFixed(2)}€ (Mínimo: ${minOrder}€)`);
        }

        draftOrders.push({
            id: uuidv4(),
            orderNumber: `PED-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 4)}`.toUpperCase(),
            supplierId,
            date: new Date().toISOString().split('T')[0]!, // Created today
            deliveryDate: earliestNeeded, // Expected delivery (= Need date)
            orderDeadline,
            status: 'DRAFT',
            items,
            totalCost: parseFloat(totalCost.toFixed(2)),
            outletId: 'unknown',
            type: 'AUTOMATIC'
        });
    });

    return { orders: draftOrders, warnings };
};
