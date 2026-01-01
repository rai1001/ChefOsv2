import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '@/presentation/store/useStore';
import type { IngestionItem } from '@/utils/excelImport';
import { Check, Trash2, Link, Plus, Search, Box, Layers, X, Sparkles, Package } from 'lucide-react';
import Fuse from 'fuse.js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

interface ImportPreviewGridProps {
  items: IngestionItem[];
  onConfirm: (finalItems: IngestionItem[], selectedSupplier?: string) => void;
  onCancel: () => void;
}

export const ImportPreviewGrid: React.FC<ImportPreviewGridProps> = ({
  items: initialItems,
  onConfirm,
  onCancel,
}) => {
  const { ingredients: existingIngredients, suppliers } = useStore();
  const [items, setItems] = useState<IngestionItem[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null);
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [isClassifying, setIsClassifying] = useState(false);

  // Fuse.js for fuzzy matching
  const fuse = useMemo(
    () =>
      new Fuse(existingIngredients, {
        keys: ['name'],
        threshold: 0.3,
      }),
    [existingIngredients]
  );

  const handleUpdateItem = (index: number, newData: any) => {
    setItems((prevItems) =>
      prevItems.map((item, i) =>
        i === index ? { ...item, data: { ...item.data, ...newData } } : item
      )
    );
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAutoClassify = async () => {
    setIsClassifying(true);
    try {
      // Get all ingredient names
      const ingredientNames = items
        .filter((item) => item.type === 'ingredient')
        .map((item) => item.data.name);

      if (ingredientNames.length === 0) {
        alert('No hay ingredientes para clasificar');
        return;
      }

      // Call AI function to classify
      const classifyIngredients = httpsCallable(functions, 'classifyIngredients');
      const result = await classifyIngredients({ ingredients: ingredientNames });
      const classifications = (result.data as any).classifications;

      // Update items with classifications
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.type === 'ingredient' && item.data.name) {
            const classification = classifications[item.data.name];
            if (classification) {
              return {
                ...item,
                data: {
                  ...item.data,
                  category: classification.category,
                  allergens: classification.allergens || [],
                },
              };
            }
          }
          return item;
        })
      );

      alert('✅ Clasificación automática completada');
    } catch (error: any) {
      console.error('Error clasificando:', error);
      alert('❌ Error al clasificar: ' + error.message);
    } finally {
      setIsClassifying(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      (item.data.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-h-[70vh] space-y-4">
      {/* Header & Search */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors"
            size={16}
          />
          <input
            type="text"
            placeholder="BUSCAR EN EXTRACCIÓN..."
            className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all font-mono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-slate-500">
          <Box size={14} className="text-primary" />
          <span>{items.length} detectados</span>
        </div>
      </div>

      {/* Supplier Selection & Auto-Classify */}
      <div className="flex gap-3 p-4 bg-black/40 rounded-xl border border-white/5">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            <Package size={12} className="inline mr-1" />
            Proveedor Global (Opcional - sobreescribe proveedores individuales)
          </label>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
          >
            <option value="">Sin proveedor global - usar proveedores individuales</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleAutoClassify}
            disabled={isClassifying || items.filter((i) => i.type === 'ingredient').length === 0}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isClassifying ? (
              <>
                <Sparkles size={14} className="animate-spin" />
                Clasificando...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Clasificar con IA
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto rounded-2xl border border-white/5 bg-black/40 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-md z-10">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                Tipo
              </th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                Nombre
              </th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                Proveedor
              </th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-center">
                IA
              </th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                Match / Status
              </th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredItems.map((item, idx) => {
              const match =
                item.type === 'ingredient' ? fuse.search(item.data.name || '')[0] : null;
              const isLowConfidence = (item.confidence || 0) < 75;

              return (
                <React.Fragment key={idx}>
                  <tr className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3">
                      <span
                        className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md ${
                          item.type === 'recipe'
                            ? 'bg-purple-500/20 text-purple-400'
                            : item.type === 'ingredient'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className={`bg-transparent border-none focus:ring-0 text-sm font-bold w-full ${isLowConfidence ? 'text-amber-400' : 'text-slate-200'}`}
                        value={item.data.name || ''}
                        onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {item.type === 'ingredient' &&
                      (item.data.supplier || item.data.supplierName) ? (
                        <span className="text-xs text-slate-400 font-mono">
                          {item.data.supplier || item.data.supplierName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div
                        className={`text-[10px] font-mono font-bold ${
                          !item.confidence
                            ? 'text-slate-400'
                            : item.confidence >= 90
                              ? 'text-emerald-400'
                              : item.confidence >= 75
                                ? 'text-blue-400'
                                : 'text-amber-500'
                        }`}
                      >
                        {item.confidence ? `${item.confidence}%` : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {searchingIdx === idx ? (
                        <div className="flex flex-col gap-2 relative z-50">
                          <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-primary/50 p-1">
                            <Search size={12} className="ml-2 text-primary" />
                            <input
                              autoFocus
                              type="text"
                              className="bg-transparent border-none focus:ring-0 text-[10px] text-white w-full py-1"
                              placeholder="Buscar en maestros..."
                              value={manualSearchTerm}
                              onChange={(e) => setManualSearchTerm(e.target.value)}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchingIdx(null);
                              }}
                              className="p-1 hover:bg-white/10 rounded"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {manualSearchTerm.length >= 2 && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-slate-900 border border-white/10 rounded-lg shadow-2xl max-h-40 overflow-y-auto z-50 divide-y divide-white/5 custom-scrollbar">
                              {fuse.search(manualSearchTerm).map((res: any) => (
                                <button
                                  key={res.item.id}
                                  onClick={() => {
                                    handleUpdateItem(idx, {
                                      ...res.item,
                                      isManualMatch: true,
                                    });
                                    // Update confidence to 100 for manual match
                                    setItems((prev) =>
                                      prev.map((it, i) =>
                                        i === idx ? { ...it, confidence: 100 } : it
                                      )
                                    );
                                    setSearchingIdx(null);
                                    setManualSearchTerm('');
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-primary/20 text-[10px] text-slate-300 hover:text-white transition-colors flex flex-col"
                                >
                                  <span className="font-bold">{res.item.name}</span>
                                  <span className="text-[8px] text-slate-500 uppercase tracking-tighter">
                                    {res.item.unit} • {res.item.category}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : match ? (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <Link size={12} className="text-primary" />
                          <span className="font-mono truncate max-w-[150px] italic">
                            Match: {match.item.name}
                          </span>
                          <button
                            onClick={() => {
                              setSearchingIdx(idx);
                              setManualSearchTerm(item.data.name);
                            }}
                            className="ml-auto p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Cambiar match"
                          >
                            <Search size={10} />
                          </button>
                        </div>
                      ) : item.type === 'ingredient' ? (
                        <button
                          onClick={() => {
                            setSearchingIdx(idx);
                            setManualSearchTerm(item.data.name);
                          }}
                          className="flex items-center gap-2 text-[10px] text-emerald-500 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-all border border-transparent hover:border-emerald-500/30 group/btn"
                        >
                          <Plus
                            size={12}
                            className="group-hover/btn:scale-125 transition-transform"
                          />
                          <span className="font-black uppercase tracking-widest">
                            Nuevo Ingrediente
                          </span>
                        </button>
                      ) : item.type === 'recipe' ? (
                        <div className="flex items-center gap-2 text-[10px] text-purple-400 font-black uppercase tracking-widest">
                          <Layers size={12} />
                          <span>{item.data.ingredients?.length || 0} Ingredientes</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-mono italic">
                          Automatic linking...
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {item.type === 'recipe' && item.data.ingredients?.length > 0 && (
                          <button
                            onClick={() => {
                              const recipeIngs = item.data.ingredients.map((ri: any) => ({
                                type: 'ingredient',
                                data: {
                                  name: ri.name || ri.ingredient?.name || 'Nuevo Ingrediente',
                                  unit: ri.unit || 'kg',
                                  costPerUnit: 0,
                                },
                                confidence: 80,
                              }));
                              setItems([...items, ...recipeIngs]);
                            }}
                            className="p-1.5 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter"
                            title="Extraer ingredientes como items individuales"
                          >
                            <Plus size={12} />
                            Extraer
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1.5 hover:bg-red-500/20 text-slate-600 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {item.type === 'recipe' && item.data.ingredients?.length > 0 && (
                    <tr className="bg-black/40 border-b border-white/5">
                      <td colSpan={5} className="px-12 py-3 bg-white/[0.02]">
                        <div className="flex flex-col gap-1.5">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 font-mono">
                            Ingredientes Detectados:
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                            {item.data.ingredients.map((ri: any, rIdx: number) => (
                              <div
                                key={rIdx}
                                className="flex justify-between items-center text-[11px] text-slate-400 font-mono"
                              >
                                <span className="truncate">{ri.name || ri.ingredient?.name}</span>
                                <span className="text-primary font-bold">
                                  {ri.quantity} {ri.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 pt-4 border-t border-white/5">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            // 1. Pre-process and link items
            const normalizedItems = [...items].map((item) => {
              // Ensure all "new" items have a stable ID for the backend
              if (!item.data.id) {
                item.data.id = uuidv4();
              }
              return item;
            });

            // 2. Build Name -> ID Map
            const nameToIdMap = new Map<string, string>();

            // First, register existing ingredients (for automatic linking)
            existingIngredients.forEach((ing) => {
              nameToIdMap.set(ing.name.toLowerCase().trim(), ing.id);
            });

            // Then, register items from the grid (matching takes precedence)
            normalizedItems.forEach((item) => {
              const nameKey = (item.data.name || '').toLowerCase().trim();
              if (!nameKey) return;

              if (item.type === 'ingredient') {
                // If item.data holds a full ingredient from a match, it already has an ID
                nameToIdMap.set(nameKey, item.data.id);
              }
            });

            // 3. Normalize Recipes
            const finalItems = normalizedItems.map((item) => {
              if (item.type === 'recipe' && item.data.ingredients) {
                const updatedIngredients = item.data.ingredients.map((ri: any) => {
                  const ingName = (ri.name || ri.ingredient?.name || '').toLowerCase().trim();
                  const matchedId = nameToIdMap.get(ingName);

                  return {
                    ...ri,
                    ingredientId: matchedId || ri.ingredientId || 'unknown',
                  };
                });

                return {
                  ...item,
                  data: {
                    ...item.data,
                    ingredients: updatedIngredients,
                  },
                };
              }
              return item;
            });

            onConfirm(finalItems, selectedSupplier || undefined);
          }}
          disabled={items.length === 0}
          className="flex-[2] px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          Confirmar e Importar {items.length} Items
        </button>
      </div>
    </div>
  );
};
