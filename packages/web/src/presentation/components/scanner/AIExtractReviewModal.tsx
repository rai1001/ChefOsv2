import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Brain, Package, Utensils, ShoppingCart, Loader2, ChevronDown, Search } from 'lucide-react';
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

function SearchableMatchSelector({ value, onChange, recipes, ingredients }: {
    value: { id: string, type: 'recipe' | 'ingredient' } | undefined;
    onChange: (match: { id: string, type: 'recipe' | 'ingredient' } | undefined) => void;
    recipes: any[];
    ingredients: any[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const currentMatch = useMemo(() => {
        if (!value) return null;
        if (value.type === 'recipe') return recipes.find(r => r.id === value.id);
        return ingredients.find(i => i.id === value.id);
    }, [value, recipes, ingredients]);

    const filteredRecipes = useMemo(() =>
        recipes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50)
        , [recipes, searchTerm]);

    const filteredIngredients = useMemo(() =>
        ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50)
        , [ingredients, searchTerm]);

    return (
        <div className={`relative ${isOpen ? 'z-[100]' : 'z-auto'}`}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`flex items-center justify-between w-full bg-[#1a2234] border rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer hover:border-primary/50 group ${currentMatch ? 'text-white border-primary/40 bg-primary/10' : 'text-slate-400 border-white/10'
                    }`}
            >
                <div className="truncate flex items-center gap-2.5">
                    {currentMatch ? (
                        <>
                            <span className="text-sm">{value?.type === 'recipe' ? '📖' : '📦'}</span>
                            <span className="truncate font-bold italic">{currentMatch.name}</span>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 opacity-60">
                            <Search size={14} className="text-slate-400" />
                            <span>Seleccionar vinculación...</span>
                        </div>
                    )}
                </div>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 z-[110] w-[380px] md:w-[450px] mt-2 bg-slate-950 border border-white/20 rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in animate-out fade-out slide-in-from-top-4 duration-200 ease-out"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-3 border-b border-white/10 bg-slate-900">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-3 w-4 h-4 text-primary" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-black border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none focus:border-primary transition-all placeholder:text-slate-500"
                                placeholder="Escribe para filtrar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-slate-950">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onChange(undefined);
                                setIsOpen(false);
                            }}
                            className="w-full px-5 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 hover:bg-white/10 hover:text-white transition-all border-b border-white/5"
                        >
                            -- No Vinculado --
                        </button>

                        {filteredRecipes.length > 0 && (
                            <div className="py-2">
                                <div className="px-5 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/20 sticky top-0 z-10 border-y border-primary/20">
                                    📖 Fichas Técnicas
                                </div>
                                {filteredRecipes.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onChange({ id: r.id, type: 'recipe' });
                                            setIsOpen(false);
                                        }}
                                        className="w-full px-5 py-3 text-left text-xs font-bold text-slate-200 hover:bg-primary hover:text-white transition-all flex items-center gap-3 border-b border-white/[0.05] group/item"
                                    >
                                        <span className="opacity-70 group-hover/item:opacity-100 transition-opacity text-sm">📖</span>
                                        <span className="truncate">{r.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredIngredients.length > 0 && (
                            <div className="py-2 border-t border-white/5">
                                <div className="px-5 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/20 sticky top-0 z-10 border-y border-emerald-500/20">
                                    📦 Ingredientes Directos
                                </div>
                                {filteredIngredients.map(i => (
                                    <button
                                        key={i.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onChange({ id: i.id, type: 'ingredient' });
                                            setIsOpen(false);
                                        }}
                                        className="w-full px-5 py-3 text-left text-xs font-bold text-slate-200 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-3 border-b border-white/[0.05] group/item"
                                    >
                                        <span className="opacity-70 group-hover/item:opacity-100 transition-opacity text-sm">📦</span>
                                        <span className="truncate flex-1">{i.name}</span>
                                        <span className="text-[10px] opacity-40 font-mono italic shrink-0 group-hover/item:opacity-70">({i.unit})</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredRecipes.length === 0 && filteredIngredients.length === 0 && (
                            <div className="px-5 py-12 text-center bg-black/40">
                                <p className="text-[11px] font-bold text-slate-500 italic uppercase tracking-wider">
                                    No se han encontrado resultados
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Backdrop for closing */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[65] cursor-default bg-black/80"
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

export const AIExtractReviewModal: React.FC<AIExtractReviewModalProps> = ({ event, data, onClose, onSyncComplete }) => {
    const { recipes, ingredients, activeOutletId, addProductionTask, fetchPurchaseOrders } = useStore();
    const [matches, setMatches] = useState<Record<string, { id: string, type: 'recipe' | 'ingredient' }>>({}); // itemId -> match
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
                    uid: `${course.category}_${item.name}`
                });
            });
        });
        return items;
    }, [data]);

    // Initial fuzzy matching
    useEffect(() => {
        const newMatches: Record<string, { id: string, type: 'recipe' | 'ingredient' }> = {};
        const initialTasks = new Set<string>();
        const initialPurchases = new Set<string>();

        allItems.forEach(item => {
            // Priority 1: Find best recipe match
            const recipeMatch = recipes.find(r =>
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
                const ingMatch = ingredients.find(i =>
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

    const sortedRecipes = useMemo(() => [...recipes].sort((a, b) => a.name.localeCompare(b.name)), [recipes]);
    const sortedIngredients = useMemo(() => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)), [ingredients]);

    const handleSync = async () => {
        if (!activeOutletId) return;
        setIsSyncing(true);
        // ... (rest of handleSync logic remains the same)
        try {
            // 1. Sync Production Tasks
            const tasksToCreate: KanbanTask[] = [];
            selectedTasks.forEach(uid => {
                const item = allItems.find(i => i.uid === uid);
                const match = matches[uid];

                if (item && match) {
                    const recipe = match.type === 'recipe' ? recipes.find(r => r.id === match.id) : null;
                    const ingredient = match.type === 'ingredient' ? ingredients.find(i => i.id === match.id) : null;

                    tasksToCreate.push({
                        id: `task_${uuidv4().slice(0, 8)}`,
                        eventId: event.id,
                        title: item.name,
                        description: `[${item.category}] ${item.notes || ''} ${item.isHandwritten ? '(Anotación Manual)' : ''} ${match.type === 'ingredient' ? '(Servicio Directo)' : ''}`,
                        quantity: item.quantity || event.pax,
                        unit: match.type === 'ingredient' ? (ingredient?.unit || 'un') : 'pax',
                        status: 'todo',
                        recipeId: match.type === 'recipe' ? match.id : undefined,
                        station: recipe?.station || 'cold',
                        outletId: activeOutletId
                    });
                }
            });

            for (const task of tasksToCreate) {
                await addProductionTask(event.id, task);
            }

            // 2. Sync Purchasing (Draft Order)
            if (selectedPurchases.size > 0) {
                const purchasingItems: { ingredient: any, quantity: number }[] = [];

                selectedPurchases.forEach(uid => {
                    const match = matches[uid];
                    if (!match) return;

                    if (match.type === 'recipe') {
                        // Explode recipe
                        const requirements = RequirementsService.calculateRequirements(
                            [{ ...event, menuId: 'temp', menu: { id: 'temp', name: 'temp', recipeIds: [match.id] } } as any],
                            {
                                menus: { 'temp': { id: 'temp', name: 'temp', recipeIds: [match.id] } as any },
                                recipes: recipes.reduce((acc, r) => ({ ...acc, [r.id]: r }), {}),
                                ingredients: ingredients.reduce((acc, i) => ({ ...acc, [i.id]: i }), {})
                            }
                        );

                        requirements.forEach(req => {
                            const ing = ingredients.find(i => i.id === req.ingredientId);
                            if (ing) {
                                purchasingItems.push({ ingredient: ing, quantity: req.totalGrossQuantity });
                            }
                        });
                    } else {
                        // Direct ingredient
                        const ing = ingredients.find(i => i.id === match.id);
                        const item = allItems.find(i => i.uid === uid);
                        if (ing) {
                            // Scale by event pax if no specific quantity mentioned in AI scan for that item
                            const qty = item?.quantity ? parseFloat(item.quantity) : event.pax;
                            purchasingItems.push({ ingredient: ing, quantity: qty });
                        }
                    }
                });

                if (purchasingItems.length > 0) {
                    const bySupplier: Record<string, { ingredient: any, quantity: number }[]> = {};
                    purchasingItems.forEach(pi => {
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
            console.error("Sync failed:", error);
            alert("Error al sincronizar datos");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/20 rounded-xl text-primary">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Revisar Extracción AI</h2>
                            <p className="text-sm text-slate-400">Vincula los platos con Recetas o Ingredientes directos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                                    <h3 className="text-sm font-black text-primary flex items-center gap-3 uppercase tracking-[0.2em] border-b border-primary/20 pb-3">
                                        <div className="p-1.5 bg-primary/10 rounded-lg">
                                            <Utensils size={14} />
                                        </div>
                                        {category}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {items.map((item: any, iIdx: number) => {
                                            const uid = `${category}_${item.name}`;
                                            const match = matches[uid];
                                            const isMatched = !!match;

                                            return (
                                                <div
                                                    key={iIdx}
                                                    className={`group p-5 rounded-[1.5rem] border transition-all duration-300 relative ${isMatched
                                                        ? 'bg-white/[0.03] border-primary/30 shadow-lg shadow-primary/5'
                                                        : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                                                        }`}
                                                >
                                                    {/* Glow effect on matched */}
                                                    {isMatched && (
                                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 blur-2xl rounded-full" />
                                                    )}

                                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-black text-xs text-white uppercase tracking-tight group-hover:text-primary transition-colors truncate">
                                                                    {item.name}
                                                                </h4>
                                                                {item.isHandwritten && (
                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md">
                                                                        <span className="text-[7px] font-black uppercase tracking-widest">Manual</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider line-clamp-1 italic">
                                                                {item.notes || 'Sin observaciones'}
                                                            </p>
                                                        </div>
                                                        <div className="ml-4 shrink-0">
                                                            <div className="px-2 py-1 bg-black/40 border border-white/5 rounded-lg">
                                                                <span className="font-mono text-[10px] font-black text-white">
                                                                    {item.quantity || event.pax} <span className="text-[8px] text-slate-500 font-sans">PAX</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 relative z-10">
                                                        <SearchableMatchSelector
                                                            value={match}
                                                            onChange={(m) => {
                                                                if (!m) {
                                                                    setMatches(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[uid];
                                                                        return next;
                                                                    });
                                                                } else {
                                                                    setMatches(prev => ({ ...prev, [uid]: m }));
                                                                }
                                                            }}
                                                            recipes={sortedRecipes}
                                                            ingredients={sortedIngredients}
                                                        />
                                                        {!isMatched && (
                                                            <div className="absolute -left-1 -top-1 pointer-events-none">
                                                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                                <div
                                                                    onClick={() => {
                                                                        const next = new Set(selectedTasks);
                                                                        if (next.has(uid)) next.delete(uid); else next.add(uid);
                                                                        setSelectedTasks(next);
                                                                    }}
                                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTasks.has(uid) ? 'bg-primary border-primary' : 'border-white/20 group-hover:border-white/40'
                                                                        }`}
                                                                >
                                                                    {selectedTasks.has(uid) && <Check className="w-3.5 h-3.5 text-white" />}
                                                                </div>
                                                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Producción</span>
                                                            </label>

                                                            <label className={`flex items-center gap-2 cursor-pointer group ${!isMatched ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                                                <div
                                                                    onClick={() => {
                                                                        if (!isMatched) return;
                                                                        const next = new Set(selectedPurchases);
                                                                        if (next.has(uid)) next.delete(uid); else next.add(uid);
                                                                        setSelectedPurchases(next);
                                                                    }}
                                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedPurchases.has(uid) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 group-hover:border-white/40'
                                                                        }`}
                                                                >
                                                                    {selectedPurchases.size > 0 && selectedPurchases.has(uid) && <Check className="w-3.5 h-3.5 text-white" />}
                                                                </div>
                                                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Compras</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        })()}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tareas a Crear</span>
                            <span className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary" /> {selectedTasks.size}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pedidos Borrador</span>
                            <span className="text-lg font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-indigo-400" /> {selectedPurchases.size}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-400 hover:text-white font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || (selectedTasks.size === 0 && selectedPurchases.size === 0)}
                            className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sincronizando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Confirmar y Sincronizar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
