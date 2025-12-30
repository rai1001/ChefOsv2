import React, { useMemo } from 'react';
import { Ingredient } from '@/types';
import {
  Printer,
  Edit2,
  Trash2,
  Swords,
  TrendingDown,
  TrendingUp,
  Package,
  Zap,
} from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { printLabel, formatLabelData } from '../printing/PrintService';

interface IngredientListProps {
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
  onDelete: (id: string) => void;
  sortConfig: { key: any; direction: 'asc' | 'desc' };
  onSort: (key: any) => void;
}

export const IngredientList: React.FC<IngredientListProps> = React.memo(
  ({ ingredients, onEdit, onDelete, sortConfig, onSort }) => {
    const { suppliers, ingredients: allIngredients } = useStore();

    // Optimization: Create a map for O(1) lookup of ingredients by name
    // This avoids the O(N*M) complexity where N is rendered ingredients and M is total ingredients
    const priceComparisonMap = useMemo(() => {
      const map = new Map<string, Ingredient[]>();
      allIngredients.forEach((ing) => {
        // Defensive: Skip malformed or undefined ingredients
        if (!ing || !ing.name) {
          console.warn('Skipping malformed ingredient:', ing);
          return;
        }
        const key = ing.name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(ing);
      });
      return map;
    }, [allIngredients]);

    const getPriceComparison = (ing: Ingredient) => {
      const key = ing.name.toLowerCase();
      // Use the map for O(1) lookup instead of .filter()
      const matches = priceComparisonMap.get(key)?.filter((i) => i.id !== ing.id) || [];

      if (matches.length === 0) return null;

      const prices = [ing, ...matches].map((i) => ({
        price: i.lastCost?.amount || 0,
        supplier:
          suppliers.find((s) => s.id === i.suppliers?.[0]?.supplierId)?.name || 'Desconocido',
        isLowest: false,
      }));

      const minPrice = Math.min(...prices.map((p) => p.price));
      prices.forEach((p) => (p.isLowest = p.price === minPrice));

      return prices;
    };

    return (
      <div className="w-full">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
            <tr>
              <th
                className="p-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-2">
                  Nombre{' '}
                  {sortConfig.key === 'name' &&
                    (sortConfig.direction === 'asc' ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    ))}
                </div>
              </th>
              <th className="p-4">Seguimiento</th>
              <th className="p-4">Unidad</th>
              <th
                className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => onSort('stock')}
              >
                <div className="flex items-center justify-end gap-2">
                  Stock{' '}
                  {sortConfig.key === 'stock' &&
                    (sortConfig.direction === 'asc' ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    ))}
                </div>
              </th>
              <th className="p-4 text-right">Mínimo</th>
              <th
                className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => onSort('costPerUnit')}
              >
                <div className="flex items-center justify-end gap-2">
                  Coste/Ud.{' '}
                  {sortConfig.key === 'costPerUnit' &&
                    (sortConfig.direction === 'asc' ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    ))}
                </div>
              </th>
              <th className="p-4 text-left">Alérgenos</th>
              <th className="p-4 text-right">Rendimiento</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {ingredients.map((ing) => (
              <tr key={ing.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 font-medium text-white group-hover:text-primary transition-colors">
                  {ing.name}
                </td>
                <td className="p-4">
                  {ing.isTrackedInInventory !== false ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                      <Package size={10} /> Inventario
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                      <Zap size={10} /> Directo
                    </span>
                  )}
                </td>
                <td className="p-4 opacity-70">{ing.unit}</td>
                <td
                  className={`p-4 text-right font-medium ${(ing.currentStock?.value || 0) < (ing.minimumStock?.value || 0) ? 'text-red-400' : 'text-slate-300'}`}
                >
                  {ing.currentStock?.value || 0}
                </td>
                <td className="p-4 text-right opacity-50">{ing.minimumStock?.value || 0}</td>
                <td className="p-4 text-right font-mono text-emerald-400">
                  <div className="flex items-center justify-end gap-2 group/price relative">
                    {ing.lastCost?.amount.toFixed(2)}€
                    {getPriceComparison(ing) && (
                      <div className="relative cursor-help">
                        <Swords size={14} className="text-amber-400 animate-pulse" />
                        <div className="absolute right-0 bottom-full mb-2 hidden group-hover/price:block z-50">
                          <div className="glass-card p-3 border-amber-500/30 min-w-[200px] text-left shadow-xl shadow-amber-900/20">
                            <p className="text-[10px] font-bold text-amber-400 mb-2 uppercase tracking-widest">
                              Guerra de Precios
                            </p>
                            <div className="space-y-1.5">
                              {[
                                ...allIngredients.filter(
                                  (i) =>
                                    i.name.toLowerCase() === ing.name.toLowerCase() &&
                                    i.id !== ing.id
                                ),
                              ].map((match) => {
                                const supplierName =
                                  suppliers.find((s) => s.id === match.suppliers?.[0]?.supplierId)
                                    ?.name || 'Desconocido';
                                const matchPrice = match.lastCost?.amount || 0;
                                const ingPrice = ing.lastCost?.amount || 0;
                                return (
                                  <div
                                    key={match.id}
                                    className={`flex justify-between items-center text-[11px] p-1 rounded`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold text-white truncate max-w-[100px]">
                                        {supplierName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`font-mono ${matchPrice <= ingPrice ? 'text-emerald-400' : 'text-red-400'}`}
                                      >
                                        {matchPrice.toFixed(2)}€
                                      </span>
                                      {matchPrice < ingPrice ? (
                                        <TrendingDown size={10} className="text-emerald-400" />
                                      ) : matchPrice > ingPrice ? (
                                        <TrendingUp size={10} className="text-red-400" />
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-left">
                  <div className="flex flex-wrap gap-1">
                    {ing.allergens?.map((a) => {
                      if (!a || typeof a !== 'string') return null;
                      return (
                        <span
                          key={a}
                          className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded border border-red-500/20"
                          title={a}
                        >
                          {a.substring(0, 3)}
                        </span>
                      );
                    })}
                    {(!ing.allergens || ing.allergens.length === 0) && (
                      <span className="text-slate-600">-</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right opacity-70">
                  {((ing.yieldFactor || 1) * 100).toFixed(0)}%
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => onEdit(ing)}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => printLabel(formatLabelData(ing, 'INGREDIENT'))}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Imprimir Etiqueta"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(ing.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center opacity-50">
                  No hay ingredientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
);
