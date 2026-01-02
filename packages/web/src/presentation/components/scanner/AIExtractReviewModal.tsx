import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Brain,
  Package,
  Utensils,
  ShoppingCart,
  Loader2,
  ChevronDown,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import type { Event, KanbanTask } from '@/types';
import { RequirementsService } from '@/services/requirementsService';
import { generateDraftOrder } from '@/services/purchasingService';
import { v4 as uuidv4 } from 'uuid';

interface AIExtractReviewModalProps {
  event: Event;
  data: any; // The JSON from Gemini
  onClose: () => void;
  onSyncComplete: () => void;
}

function SearchableMatchSelector({
  value,
  onChange,
  recipes,
  ingredients,
}: {
  value: { id: string; type: 'recipe' | 'ingredient' } | undefined;
  onChange: (match: { id: string; type: 'recipe' | 'ingredient' } | undefined) => void;
  recipes: any[];
  ingredients: any[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentMatch = useMemo(() => {
    if (!value) return null;
    if (value.type === 'recipe') return recipes.find((r) => r.id === value.id);
    return ingredients.find((i) => i.id === value.id);
  }, [value, recipes, ingredients]);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50),
    [recipes, searchTerm]
  );

  const filteredIngredients = useMemo(
    () =>
      ingredients
        .filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 50),
    [ingredients, searchTerm]
  );

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          });
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
    return undefined;
  }, [isOpen]);

  return (
    <div className={`relative ${isOpen ? 'z-[100]' : 'z-auto'}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between w-full h-9 bg-[#1a2234] border rounded-lg px-3 text-[11px] font-medium transition-all cursor-pointer hover:border-primary/50 group ${
          currentMatch
            ? 'text-white border-primary/40 bg-primary/10'
            : 'text-slate-400 border-white/10'
        }`}
      >
        <div className="truncate flex items-center gap-2">
          {currentMatch ? (
            <>
              <span className="text-xs">{value?.type === 'recipe' ? '📖' : '📦'}</span>
              <span className="truncate font-semibold">{currentMatch.name}</span>
            </>
          ) : (
            <div className="flex items-center gap-2 opacity-60">
              <Search size={12} className="text-slate-400" />
              <span className="italic">Seleccionar vinculación...</span>
            </div>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-500 group-hover:text-slate-300'}`}
        />
      </button>

      {isOpen &&
        dropdownPosition &&
        createPortal(
          <div
            className="fixed z-[9999] w-[300px] md:w-[350px] mt-1 border border-white/20 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,1)] overflow-hidden isolate"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              backgroundColor: '#111827',
              opacity: 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-primary" />
                <input
                  autoFocus
                  type="text"
                  className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-primary transition-all placeholder:text-slate-500"
                  placeholder="Buscar receta o ingrediente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div
              className="max-h-[250px] overflow-y-auto custom-scrollbar"
              style={{ backgroundColor: '#111827' }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(undefined);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-white/5 hover:text-white transition-all border-b border-white/5"
              >
                -- Desvincular --
              </button>

              {filteredRecipes.length > 0 && (
                <div className="py-1">
                  <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 sticky top-0 z-10 backdrop-blur-sm border-y border-primary/10">
                    📖 Fichas Técnicas
                  </div>
                  {filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange({ id: r.id, type: 'recipe' });
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-primary/20 hover:text-white transition-all flex items-center gap-2 border-b border-white/[0.02] group/item"
                    >
                      <span className="truncate">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {filteredIngredients.length > 0 && (
                <div className="py-1 border-t border-white/5">
                  <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 sticky top-0 z-10 backdrop-blur-sm border-y border-emerald-500/10">
                    📦 Ingredientes
                  </div>
                  {filteredIngredients.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange({ id: i.id, type: 'ingredient' });
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-emerald-500/20 hover:text-white transition-all flex items-center gap-2 border-b border-white/[0.02] group/item"
                    >
                      <span className="truncate flex-1">{i.name}</span>
                      <span className="text-[9px] opacity-40 font-mono group-hover/item:opacity-70">
                        {i.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {filteredRecipes.length === 0 && filteredIngredients.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[10px] text-slate-600 italic">Sin resultados</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[65] cursor-default bg-transparent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

export const AIExtractReviewModal: React.FC<AIExtractReviewModalProps> = ({
  event,
  data,
  onClose,
  onSyncComplete,
}) => {
  const { recipes, ingredients, activeOutletId, addProductionTask, fetchPurchaseOrders } =
    useStore();
  const [matches, setMatches] = useState<
    Record<string, { id: string; type: 'recipe' | 'ingredient' }>
  >({}); // itemId -> match
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  // Flatten all items for easier mapping
  const allItems = useMemo(() => {
    const items: any[] = [];
    data.courses?.forEach((course: any) => {
      course.items.forEach((item: any) => {
        items.push({
          ...item,
          category: course.category,
          uid: `${course.category}_${item.name}`,
        });
      });
    });
    return items;
  }, [data]);

  // Initial fuzzy matching
  useEffect(() => {
    const newMatches: Record<string, { id: string; type: 'recipe' | 'ingredient' }> = {};
    const initialTasks = new Set<string>();
    const initialPurchases = new Set<string>();

    allItems.forEach((item) => {
      // Priority 1: Find best recipe match
      const recipeMatch = recipes.find(
        (r) =>
          r.name.toLowerCase() === item.name.toLowerCase() ||
          r.name.toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes(r.name.toLowerCase())
      );

      if (recipeMatch) {
        newMatches[item.uid] = { id: recipeMatch.id, type: 'recipe' };
        initialTasks.add(item.uid);
        initialPurchases.add(item.uid);
      } else {
        // Priority 2: Find best ingredient match
        const ingMatch = ingredients.find(
          (i) =>
            i.name.toLowerCase() === item.name.toLowerCase() ||
            i.name.toLowerCase().includes(item.name.toLowerCase()) ||
            item.name.toLowerCase().includes(i.name.toLowerCase())
        );
        if (ingMatch) {
          newMatches[item.uid] = { id: ingMatch.id, type: 'ingredient' };
          initialTasks.add(item.uid);
          initialPurchases.add(item.uid);
        }
      }
    });

    setMatches(newMatches);
    setSelectedTasks(initialTasks);
    setSelectedPurchases(initialPurchases);
  }, [allItems, recipes, ingredients]);

  const sortedRecipes = useMemo(
    () => [...recipes].sort((a, b) => a.name.localeCompare(b.name)),
    [recipes]
  );
  const sortedIngredients = useMemo(
    () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
    [ingredients]
  );

  const matchedCount = Object.keys(matches).length;
  const totalItems = allItems.length;
  const progressPercentage = Math.round((matchedCount / totalItems) * 100) || 0;

  const handleSync = async () => {
    if (!activeOutletId) return;
    setIsSyncing(true);
    // ... (rest of handleSync logic remains the same)
    try {
      // 1. Sync Production Tasks
      const tasksToCreate: KanbanTask[] = [];
      selectedTasks.forEach((uid) => {
        const item = allItems.find((i) => i.uid === uid);
        const match = matches[uid];

        if (item && match) {
          const recipe = match.type === 'recipe' ? recipes.find((r) => r.id === match.id) : null;
          const ingredient =
            match.type === 'ingredient' ? ingredients.find((i) => i.id === match.id) : null;

          tasksToCreate.push({
            id: `task_${uuidv4().slice(0, 8)}`,
            eventId: event.id,
            title: item.name,
            description: `[${item.category}] ${item.notes || ''} ${item.isHandwritten ? '(Anotación Manual)' : ''} ${match.type === 'ingredient' ? '(Servicio Directo)' : ''}`,
            quantity: item.quantity || event.pax,
            unit: match.type === 'ingredient' ? ingredient?.unit || 'un' : 'pax',
            status: 'todo',
            recipeId: match.type === 'recipe' ? match.id : undefined,
            station: recipe?.station || 'cold',
            outletId: activeOutletId,
          });
        }
      });

      for (const task of tasksToCreate) {
        await addProductionTask(event.id, task);
      }

      // 2. Sync Purchasing (Draft Order)
      if (selectedPurchases.size > 0) {
        const purchasingItems: { ingredient: any; quantity: number }[] = [];

        selectedPurchases.forEach((uid) => {
          const match = matches[uid];
          if (!match) return;

          if (match.type === 'recipe') {
            // Explode recipe
            const requirements = RequirementsService.calculateRequirements(
              [
                {
                  ...event,
                  menuId: 'temp',
                  menu: { id: 'temp', name: 'temp', recipeIds: [match.id] },
                } as any,
              ],
              {
                menus: { temp: { id: 'temp', name: 'temp', recipeIds: [match.id] } as any },
                recipes: recipes.reduce((acc, r) => ({ ...acc, [r.id]: r }), {}),
                ingredients: ingredients.reduce((acc, i) => ({ ...acc, [i.id]: i }), {}),
              }
            );

            requirements.forEach((req) => {
              const ing = ingredients.find((i) => i.id === req.ingredientId);
              if (ing) {
                purchasingItems.push({ ingredient: ing, quantity: req.totalGrossQuantity });
              }
            });
          } else {
            // Direct ingredient
            const ing = ingredients.find((i) => i.id === match.id);
            const item = allItems.find((i) => i.uid === uid);
            if (ing) {
              // Scale by event pax if no specific quantity mentioned in AI scan for that item
              const qty = item?.quantity ? parseFloat(item.quantity) : event.pax;
              purchasingItems.push({ ingredient: ing, quantity: qty });
            }
          }
        });

        if (purchasingItems.length > 0) {
          const bySupplier: Record<string, { ingredient: any; quantity: number }[]> = {};
          purchasingItems.forEach((pi) => {
            const sId = pi.ingredient.supplierId || 'MANUAL';
            if (!bySupplier[sId]) bySupplier[sId] = [];
            bySupplier[sId].push(pi);
          });

          for (const [sId, items] of Object.entries(bySupplier)) {
            await generateDraftOrder(sId, activeOutletId, items);
          }
          await fetchPurchaseOrders({ reset: true });
        }
      }

      onSyncComplete();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Error al sincronizar datos');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10">
          <div className="p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl text-primary border border-primary/20 shadow-lg shadow-primary/10">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Revisar Extracción AI
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {event.name}
                  </span>
                  <span className="text-xs text-slate-500">• {totalItems} items detectados</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-slate-800">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                progressPercentage === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-primary'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0f1218]">
          <div className="grid grid-cols-1 gap-8">
            {(() => {
              // Group items by category to avoid duplicate headers
              const groupedCategories: Record<string, any[]> = {};
              data.courses?.forEach((course: any) => {
                const cat = course.category || 'Otros';
                if (!groupedCategories[cat]) groupedCategories[cat] = [];
                groupedCategories[cat].push(...course.items);
              });

              return Object.entries(groupedCategories).map(([category, items]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.2em] border-b border-white/5 pb-3">
                    <div className="p-1 bg-white/5 rounded-md text-slate-400">
                      <Utensils size={12} />
                    </div>
                    {category}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item: any, iIdx: number) => {
                      const uid = `${category}_${item.name}`;
                      const match = matches[uid];
                      const isMatched = !!match;

                      return (
                        <div
                          key={iIdx}
                          className={`group flex flex-col p-4 rounded-2xl border transition-all duration-300 relative ${
                            isMatched
                              ? 'bg-[#161b26] border-emerald-500/20 shadow-lg shadow-emerald-900/10'
                              : 'bg-white/[0.02] border-white/5 hover:border-white/10 shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-1.5">
                                {isMatched ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                )}
                                <h4
                                  className={`font-bold text-sm leading-tight line-clamp-2 ${
                                    isMatched ? 'text-white' : 'text-amber-500/90'
                                  }`}
                                >
                                  {item.name}
                                </h4>
                              </div>

                              {item.notes && item.notes !== 'Sin observaciones' ? (
                                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                  {item.notes}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-600 italic">
                                  Sin observaciones
                                </p>
                              )}

                              {item.isHandwritten && (
                                <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[9px] font-bold uppercase tracking-wider">
                                  Manual
                                </span>
                              )}
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <div className="px-2 py-1 bg-black/40 border border-white/5 rounded-md min-w-[50px] text-center">
                                <span className="font-mono text-xs font-bold text-white">
                                  {item.quantity || event.pax}
                                </span>
                                <span className="ml-1 text-[9px] text-slate-500 font-sans uppercase">
                                  PAX
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto pt-3 border-t border-white/5 space-y-3">
                            <SearchableMatchSelector
                              value={match}
                              onChange={(m) => {
                                if (!m) {
                                  setMatches((prev) => {
                                    const next = { ...prev };
                                    delete next[uid];
                                    return next;
                                  });
                                } else {
                                  setMatches((prev) => ({ ...prev, [uid]: m }));
                                }
                              }}
                              recipes={sortedRecipes}
                              ingredients={sortedIngredients}
                            />

                            <div className="flex items-center justify-between gap-2 px-1">
                              <label
                                className={`flex items-center gap-2 cursor-pointer group/task select-none transition-opacity ${
                                  !isMatched ? 'opacity-50' : 'opacity-100'
                                }`}
                                title={
                                  !isMatched
                                    ? 'Vincula un item primero'
                                    : 'Crear tarea de producción'
                                }
                              >
                                <div
                                  onClick={() => {
                                    if (!isMatched) return;
                                    const next = new Set(selectedTasks);
                                    if (next.has(uid)) next.delete(uid);
                                    else next.add(uid);
                                    setSelectedTasks(next);
                                  }}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    selectedTasks.has(uid)
                                      ? 'bg-primary border-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                      : 'border-slate-600 bg-black/20 group-hover/task:border-slate-400'
                                  }`}
                                >
                                  {selectedTasks.has(uid) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    selectedTasks.has(uid) ? 'text-primary' : 'text-slate-500'
                                  }`}
                                >
                                  Tarea
                                </span>
                              </label>

                              <label
                                className={`flex items-center gap-2 cursor-pointer group/buy select-none transition-opacity ${
                                  !isMatched ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
                                }`}
                                title={
                                  !isMatched
                                    ? 'Vincula un item primero'
                                    : 'Añadir a lista de compras'
                                }
                              >
                                <div
                                  onClick={() => {
                                    if (!isMatched) return;
                                    const next = new Set(selectedPurchases);
                                    if (next.has(uid)) next.delete(uid);
                                    else next.add(uid);
                                    setSelectedPurchases(next);
                                  }}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    selectedPurchases.has(uid)
                                      ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                      : 'border-slate-600 bg-black/20 group-hover/buy:border-slate-400'
                                  }`}
                                >
                                  {selectedPurchases.size > 0 && selectedPurchases.has(uid) && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    selectedPurchases.has(uid)
                                      ? 'text-indigo-400'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  Compra
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#161b26] flex items-center justify-between shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-8 pl-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white leading-none tracking-tight">
                  {selectedTasks.size}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                  Tareas Producción
                </span>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white leading-none tracking-tight">
                  {selectedPurchases.size}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                  Pedidos Borrador
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm text-slate-400 hover:text-white font-bold transition-colors hover:bg-white/5 rounded-xl uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing || (selectedTasks.size === 0 && selectedPurchases.size === 0)}
              className="relative group overflow-hidden bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="uppercase tracking-wider text-xs">Sincronizando...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span className="uppercase tracking-wider text-xs">Confirmar Todo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
