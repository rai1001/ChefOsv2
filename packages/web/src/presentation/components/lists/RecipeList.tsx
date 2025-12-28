import React, { useMemo, useCallback, useState } from 'react';
import type { Recipe, Ingredient } from '@/types';
import { useStore } from '@/presentation/store/useStore';
import { Printer, Edit2, Trash2, ChevronDown, ChevronUp, Scale, TrendingUp } from 'lucide-react';
import { printLabel, formatLabelData } from '../printing/PrintService';
import { aggregateAllergens } from '@/utils/allergenUtils';
import { SocialChefButton } from '../social-chef/SocialChefButton';
import { SocialChefModal } from '../social-chef/SocialChefModal';
import { generateMarketingContent } from '@/services/socialChef';

interface RecipeListProps {
  recipes: Recipe[];
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onConvertToFicha: (recipeId: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
}

export const RecipeList: React.FC<RecipeListProps> = React.memo(
  ({ recipes, onEdit, onDelete, onConvertToFicha, sortConfig, onSort }) => {
    const { ingredients } = useStore();
    const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
    const [scalePax, setScalePax] = useState<number>(1);
    const [socialChefModalOpen, setSocialChefModalOpen] = useState(false);
    const [selectedRecipeForSocial, setSelectedRecipeForSocial] = useState<Recipe | null>(null);

    // Optimization: Create a map for O(1) ingredient lookup
    const ingredientMap = useMemo(() => {
      return new Map<string, Ingredient>(ingredients.map((i) => [i.id, i]));
    }, [ingredients]);

    const calculateStats = useCallback(
      (recipe: Recipe) => {
        let totalCost = 0;
        let totalKcal = 0;
        const allergens = aggregateAllergens(recipe.ingredients, ingredientMap);

        recipe.ingredients.forEach((ri) => {
          const ing = ingredientMap.get(ri.ingredientId);
          if (!ing) return;

          // Cost Calculation
          totalCost += ri.quantity * (ing.costPerUnit || 0);

          // Kcal Calculation
          if (ing.nutritionalInfo) {
            let multiplier = 0;
            if (ing.unit === 'kg' || ing.unit === 'L') {
              multiplier = ri.quantity * 10; // 1kg = 10 * 100g
            } else if (ing.unit === 'g' || ing.unit === 'ml') {
              multiplier = ri.quantity / 100;
            }
            totalKcal +=
              multiplier *
              ((ing.nutritionalInfo as any).values?.energyKcal ||
                (ing.nutritionalInfo as any).calories ||
                0);
          }
        });

        return { totalCost, totalKcal, allergens };
      },
      [ingredientMap]
    );

    const recipeStats = useMemo(() => {
      return recipes.map((recipe) => ({
        recipe,
        stats: calculateStats(recipe),
      }));
    }, [recipes, calculateStats]);

    const toggleExpand = (recipe: Recipe) => {
      if (expandedRecipeId === recipe.id) {
        setExpandedRecipeId(null);
      } else {
        setExpandedRecipeId(recipe.id);
        setScalePax(recipe.yieldPax || 1);
      }
    };

    return (
      <>
        <div className="bg-surface border border-white/5 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-black/20 text-slate-500 uppercase font-medium">
              <tr>
                <th
                  className="p-4 cursor-pointer hover:text-white transition-colors"
                  onClick={() => onSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Nombre{' '}
                    {sortConfig.key === 'name' &&
                      (sortConfig.direction === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      ))}
                  </div>
                </th>
                <th className="p-4">Partida</th>
                <th className="p-4">Ingredientes</th>
                <th
                  className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => onSort('kcal')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Kcal (Total){' '}
                    {sortConfig.key === 'kcal' &&
                      (sortConfig.direction === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      ))}
                  </div>
                </th>
                <th
                  className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => onSort('cost')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Coste{' '}
                    {sortConfig.key === 'cost' &&
                      (sortConfig.direction === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      ))}
                  </div>
                </th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recipeStats.map(({ recipe, stats }) => {
                const isExpanded = expandedRecipeId === recipe.id;
                return (
                  <React.Fragment key={recipe.id}>
                    <tr
                      className={`group hover:bg-white/[0.04] cursor-pointer transition-colors ${isExpanded ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleExpand(recipe)}
                    >
                      <td className="p-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="text-slate-500 group-hover:text-primary transition-colors">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                          <div className="flex flex-col">
                            <span>{recipe.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                              Base: {recipe.yieldPax || 1} PAX
                            </span>
                          </div>
                          {recipe.isBase && (
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              BASE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            recipe.station === 'hot'
                              ? 'bg-red-500/20 text-red-300'
                              : recipe.station === 'cold'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-pink-500/20 text-pink-300'
                          }`}
                        >
                          {recipe.station === 'hot'
                            ? 'CALIENTE'
                            : recipe.station === 'cold'
                              ? 'FRÍA'
                              : 'POSTRES'}
                        </span>
                      </td>
                      <td className="p-4 opacity-70">{recipe.ingredients.length} items</td>
                      <td className="p-4 text-right font-mono text-orange-400">
                        {stats.totalKcal > 0 ? Math.round(stats.totalKcal).toLocaleString() : '-'}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-400">
                        {stats.totalCost.toFixed(2)}€
                      </td>
                      <td className="p-4 text-center">
                        <div
                          className="flex justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onEdit(recipe)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() =>
                              printLabel(
                                formatLabelData({ ...recipe, allergens: stats.allergens }, 'PREP')
                              )
                            }
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Imprimir Etiqueta"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => onConvertToFicha(recipe.id)}
                            className="p-2 hover:bg-green-500/20 rounded-lg text-slate-400 hover:text-green-400 transition-colors"
                            title="Análisis Pro (Ficha Técnica)"
                          >
                            <TrendingUp size={18} />
                          </button>
                          <button
                            onClick={() => onDelete(recipe.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-primary/5 animate-fade-in">
                        <td colSpan={6} className="p-6">
                          <div className="glass-card p-6 border-primary/20 bg-surface/50">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                              <div className="flex-1 w-full max-w-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                    <Scale size={16} />
                                    ESCALADO INTERACTIVO
                                  </div>
                                  <span className="text-2xl font-black text-white">
                                    {scalePax} <span className="text-xs text-slate-500">PAX</span>
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max={Math.max(100, (recipe.yieldPax || 1) * 10)}
                                  value={scalePax}
                                  onChange={(e) => setScalePax(Number(e.target.value))}
                                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-widest">
                                  <span>Min: 1</span>
                                  <span>Base: {recipe.yieldPax || 1}</span>
                                  <span>Máx: {Math.max(100, (recipe.yieldPax || 1) * 10)}</span>
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <SocialChefButton
                                  onClick={() => {
                                    setSelectedRecipeForSocial(recipe);
                                    setSocialChefModalOpen(true);
                                  }}
                                  disabled={!recipe.image} // Disable if no image, or handle inside modal
                                />
                                <div className="bg-black/40 p-3 rounded-xl border border-white/5 min-w-[120px]">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                                    Coste Total
                                  </p>
                                  <p className="text-xl font-mono text-emerald-400">
                                    {(
                                      (stats.totalCost / (recipe.yieldPax || 1)) *
                                      scalePax
                                    ).toFixed(2)}
                                    €
                                  </p>
                                </div>
                                <div className="bg-black/40 p-3 rounded-xl border border-white/5 min-w-[120px]">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                                    Por Ración
                                  </p>
                                  <p className="text-xl font-mono text-slate-200">
                                    {(stats.totalCost / (recipe.yieldPax || 1)).toFixed(2)}€
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
                              {recipe.ingredients.map((ri, idx) => {
                                const ing = ingredientMap.get(ri.ingredientId);
                                const factor = scalePax / (recipe.yieldPax || 1);
                                return (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center py-2 border-b border-white/5 group/ing"
                                  >
                                    <span className="text-sm text-slate-300 group-hover/ing:text-white transition-colors">
                                      {ing?.name || 'Ingrediente desconocido'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-primary font-bold">
                                        {(ri.quantity * factor).toFixed(3)}
                                      </span>
                                      <span className="text-xs text-slate-500">{ing?.unit}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {recipes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center opacity-50">
                    No hay recetas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selectedRecipeForSocial && (
          <SocialChefModal
            isOpen={socialChefModalOpen}
            onClose={() => {
              setSocialChefModalOpen(false);
              setSelectedRecipeForSocial(null);
            }}
            recipeName={selectedRecipeForSocial.name}
            imagePath={selectedRecipeForSocial.image}
            onGenerate={() =>
              generateMarketingContent(
                selectedRecipeForSocial.name,
                selectedRecipeForSocial.image || '',
                'RESTAURANT' // TODO: Get from store/business type
              )
            }
          />
        )}
      </>
    );
  }
);
