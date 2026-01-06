import { useEffect, useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { supabase } from '@/config/supabase';
import type { Ingredient } from '@/types';

import { Quantity, Money, Unit } from '@culinaryos/core';

export const useIngredientsSync = () => {
  const { setIngredients, activeOutletId } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!activeOutletId) {
      setIngredients([]);
      setLoading(false);
      return;
    }

    const fetchIngredients = async () => {
      try {
        console.log(`[Sync] Fetching ingredients for outlet ${activeOutletId}...`);
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('ingredients')
          .select('*')
          .eq('outlet_id', activeOutletId);

        if (fetchError) {
          console.error('[Sync] Error fetching ingredients:', fetchError);
          setError(fetchError);
          setLoading(false);
          return;
        }

        const ingredients: Ingredient[] = (data || [])
          .map((row: any) => {
            try {
              const unit = row.current_stock_unit || row.unit || 'ud';
              const coreUnit = Unit.from(typeof unit === 'string' ? unit : unit.type || 'ud');

              const currentStock = new Quantity(
                row.current_stock_value || row.stock || 0,
                coreUnit
              );
              const minimumStock = new Quantity(
                row.minimum_stock_value || row.min_stock || 0,
                coreUnit
              );
              const lastCost = row.last_cost_amount
                ? new Money(row.last_cost_amount, row.last_cost_currency || 'EUR')
                : new Money(row.cost_per_unit || 0, 'EUR');

              return {
                id: row.id,
                name: row.name,
                category: row.category,
                currentStock,
                minimumStock,
                lastCost,
                unit: row.unit,
                isTrackedInInventory: row.is_tracked_in_inventory ?? true,
                suppliers: row.suppliers || [],
                allergens: row.allergens || [],
                outletId: row.outlet_id,
              } as Ingredient;
            } catch (itemErr) {
              console.error(`Error hydrating ingredient ${row.id}:`, itemErr);
              return null;
            }
          })
          .filter(Boolean) as Ingredient[];

        console.log(`[Sync] Ingredients synced (${ingredients.length})`);
        setIngredients(ingredients);
        setLoading(false);
      } catch (err: any) {
        console.error('[Sync] Error in fetchIngredients:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchIngredients();

    // Set up real-time subscription
    const channel = supabase
      .channel(`ingredients-${activeOutletId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ingredients',
          filter: `outlet_id=eq.${activeOutletId}`,
        },
        (payload) => {
          console.log('[Sync] Ingredient changed, refetching...', payload);
          fetchIngredients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setIngredients, activeOutletId]);

  return { loading, error };
};
