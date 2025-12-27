import React, { useState } from 'react';
import { Calendar, ShoppingCart, Loader2, Package, AlertCircle } from 'lucide-react';
import type { Event, Menu, Recipe, Ingredient } from '@/types';
import { RequirementsService } from '@/services/requirementsService';

// --- MOCK DATA FOR DEMO ---
const MOCK_INGREDIENTS: Record<string, Ingredient> = {
  'ing-beef': {
    id: 'ing-beef',
    name: 'Premium Beef Mince',
    unit: 'kg',
    costPerUnit: 12.5,
    yield: 1,
    wastageFactor: 0.1,
    allergens: [],
  },
  'ing-onion': {
    id: 'ing-onion',
    name: 'Red Onions',
    unit: 'kg',
    costPerUnit: 1.2,
    yield: 0.85,
    wastageFactor: 0.15,
    allergens: [],
  }, // 15% waste
  // Changed unit 'un' to 'ud' to match types/inventory.ts type definition if 'ud' is the correct one.
  // Let me double check types/inventory.ts.
  // Types says: export type Unit = 'kg' | 'g' | 'L' | 'ml' | 'un' | 'manojo';
  // So 'un' IS correct.
  // Why did the build fail with 'ud'?
  // "src/components/purchasing/SmartProcurement.tsx(11,55): error TS2322: Type '"ud"' is not assignable to type 'Unit'."
  // This implies in the PREVIOUS file version I used 'ud'.
  // In my overwrite I used 'un' in MOCK_INGREDIENTS for 'ing-bun'.
  // Wait, the error log says: Type '"ud"' is not assignable.
  // This means I assigned 'ud' but the type expects 'un' (or others).
  // Let's check my previous overwrite content for 'ing-bun'.
  // 'ing-bun': { ..., unit: 'ud', ... } was in the overwrite block I *thought* I sent?
  // Ah, in the `replace_with_git_merge_diff` that FAILED, I tried to change it but it failed.
  // So the file still has 'ud' from the very first `create_file_with_block`?
  // No, I created the file with `overwrite_file_with_block` in step 2.
  // Let me check that `overwrite_file_with_block` content.
  // It had `unit: 'ud'` for 'ing-bun'.
  // And `types/inventory.ts` has `unit: 'un'`.
  // So I need to fix it to 'un'.

  'ing-bun': {
    id: 'ing-bun',
    name: 'Brioche Buns',
    unit: 'un',
    costPerUnit: 0.5,
    yield: 1,
    wastageFactor: 0.05,
    allergens: ['gluten', 'egg'],
  },
  'ing-cheese': {
    id: 'ing-cheese',
    name: 'Cheddar Slices',
    unit: 'kg',
    costPerUnit: 8.0,
    yield: 1,
    wastageFactor: 0,
    allergens: ['dairy'],
  },
} as any;

const MOCK_RECIPES: Record<string, Recipe> = {
  'rec-burger': {
    id: 'rec-burger',
    name: 'Classic Cheeseburger',
    station: 'hot',
    yieldPax: 1,
    ingredients: [
      { ingredientId: 'ing-beef', quantity: 0.18 }, // 180g beef
      { ingredientId: 'ing-onion', quantity: 0.05 }, // 50g onion
      { ingredientId: 'ing-bun', quantity: 1 },
      { ingredientId: 'ing-cheese', quantity: 0.02 },
    ],
  },
};

const MOCK_MENUS: Record<string, Menu> = {
  'menu-lunch': { id: 'menu-lunch', name: 'Lunch Special', recipeIds: ['rec-burger'] },
};

const MOCK_EVENTS: Event[] = [
  {
    id: 'evt-1',
    name: 'Tuesday Lunch Service',
    date: new Date(Date.now() + 86400000).toISOString(),
    pax: 45,
    type: 'Mediodia',
    menuId: 'menu-lunch',
  },
  {
    id: 'evt-2',
    name: 'Corporate Event',
    date: new Date(Date.now() + 172800000).toISOString(),
    pax: 120,
    type: 'Empresa',
    menuId: 'menu-lunch',
  },
];
// --------------------------

const SmartProcurement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    // Simulate async calculation
    await new Promise((resolve) => setTimeout(resolve, 800));

    const reqs = RequirementsService.calculateRequirements(MOCK_EVENTS, {
      ingredients: MOCK_INGREDIENTS,
      recipes: MOCK_RECIPES,
      menus: MOCK_MENUS,
    });

    setRequirements(reqs);
    setHasCalculated(true);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen text-gray-100 font-sans">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <span className="text-3xl">🧠</span> Vaca Brain Purchasing
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            AI-driven requirements planning based on upcoming events
          </p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <Calendar className="w-5 h-5" />
          )}
          Analyze Next 7 Days
        </button>
      </header>

      {!hasCalculated && !loading && (
        <div className="text-center py-24 bg-gray-800/30 rounded-xl border border-gray-800 border-dashed">
          <div className="bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <ShoppingCart className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-200">Ready to Calculate</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2">
            Click "Analyze" to explode upcoming menus into ingredient lists, automatically applying
            your wastage factors.
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-800/50 animate-pulse rounded-xl border border-gray-800"
            ></div>
          ))}
        </div>
      )}

      {hasCalculated && requirements.length > 0 && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-100">Calculation Report</h4>
              <p className="text-sm text-gray-400 mt-1">
                Based on {MOCK_EVENTS.length} upcoming events (Total{' '}
                {MOCK_EVENTS.reduce((acc, e) => acc + e.pax, 0)} Pax). Wastage factors have been
                applied to gross quantities.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.map((req) => (
              <div
                key={req.ingredientId}
                className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-700 rounded-lg text-gray-300">
                      <Package size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{req.ingredientName}</h3>
                      <p className="text-xs text-gray-500">ID: {req.ingredientId}</p>
                    </div>
                  </div>
                  {req.wastageFactor > 0 && (
                    <span className="text-xs font-medium px-2 py-1 bg-red-900/30 text-red-400 rounded-full border border-red-900/50">
                      +{req.wastageFactor * 100}% Waste
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-emerald-400">
                    {req.totalGrossQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-gray-400 font-medium">{req.unit}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Total Required (Gross)</p>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-sm font-medium rounded-lg text-gray-300 transition-colors">
                    Add to Draft Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartProcurement;
