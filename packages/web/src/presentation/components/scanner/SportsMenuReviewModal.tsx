import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, Save, ShoppingCart, ListChecks, AlertTriangle } from 'lucide-react';
import { useInjection } from '@/hooks/useInjection';
import { TYPES } from '@/application/di/types';
import { SyncSportsMenuUseCase } from '@/application/use-cases/schedule/SyncSportsMenuUseCase';
import { Event } from '@/domain/entities/Event';
import { SearchableMatchSelector } from './SearchableMatchSelector';
import { useRecipes } from '@/presentation/store/recipesAtoms';
import { useIngredients } from '@/application/hooks/useIngredients';

interface SportsMenuReviewModalProps {
    event: Event;
    data: any; // Result from AI: { items: { name, quantity, category, uid }[] }
    onClose: () => void;
    onSyncComplete: () => void;
}

export const SportsMenuReviewModal: React.FC<SportsMenuReviewModalProps> = ({ event, data, onClose, onSyncComplete }) => {
    const syncUseCase = useInjection<SyncSportsMenuUseCase>(TYPES.SYNC_SPORTS_MENU_USE_CASE);
    const { recipes } = useRecipes();
    const { ingredients } = useIngredients();

    const [items] = useState<any[]>(data.items || []);
    const [matches, setMatches] = useState<Record<string, { id: string, type: 'recipe' | 'ingredient' }>>({});
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [selectedPurchases, setSelectedPurchases] = useState<string[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Auto-match logic
    useEffect(() => {
        const newMatches: Record<string, { id: string, type: 'recipe' | 'ingredient' }> = {};
        const tasks: string[] = [];
        const purchases: string[] = [];

        items.forEach(item => {
            // Find best match in recipes first
            const recipeMatch = recipes.find(r => r.name.toLowerCase() === item.name.toLowerCase());
            if (recipeMatch) {
                newMatches[item.uid] = { id: recipeMatch.id, type: 'recipe' };
                tasks.push(item.uid);
                purchases.push(item.uid);
            } else {
                // Try ingredients
                const ingMatch = ingredients.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                if (ingMatch) {
                    newMatches[item.uid] = { id: ingMatch.id, type: 'ingredient' };
                    purchases.push(item.uid);
                }
            }
        });

        setMatches(newMatches);
        setSelectedTasks(tasks);
        setSelectedPurchases(purchases);
    }, [recipes, ingredients]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncUseCase.execute({
                event,
                allItems: items,
                matches,
                selectedTasks,
                selectedPurchases,
                outletId: event.outletId || '',
                userId: 'user-123' // TODO: Get from Auth
            });
            onSyncComplete();
        } catch (error) {
            console.error("Sync error:", error);
            alert("Error al sincronizar datos");
        } finally {
            setIsSyncing(false);
        }
    };

    const toggleTask = (uid: string) => {
        setSelectedTasks(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    const togglePurchase = (uid: string) => {
        setSelectedPurchases(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="w-full max-w-5xl bg-surface rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-xl text-primary animate-pulse">
                            <ListChecks size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Revisión de Menú Digitalizado</h2>
                            <p className="text-xs text-slate-400 font-medium">Vincula los platos detectados con tu base de datos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        {items.map(item => (
                            <div key={item.uid} className="premium-glass p-4 grid grid-cols-12 gap-4 items-center group">
                                {/* AI Data */}
                                <div className="col-span-3">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Detectado por IA</p>
                                    <h4 className="font-bold text-white text-lg leading-tight">{item.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{item.quantity || event.pax} {item.unit || 'Pax'}</p>
                                </div>

                                {/* Linker */}
                                <div className="col-span-5">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Vincular con Sistema</p>
                                    <SearchableMatchSelector
                                        initialValue={matches[item.uid]?.id}
                                        recipes={recipes}
                                        ingredients={ingredients}
                                        onSelect={(option) => setMatches(prev => ({ ...prev, [item.uid]: { id: option.id, type: option.type } }))}
                                        placeholder="Buscar..."
                                    />
                                </div>

                                {/* Actions */}
                                <div className="col-span-4 flex justify-end gap-2 text-center">
                                    <button
                                        onClick={() => toggleTask(item.uid)}
                                        disabled={!matches[item.uid] || matches[item.uid]?.type !== 'recipe'}
                                        className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedTasks.includes(item.uid)
                                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                            : 'bg-black/20 border-white/5 text-slate-600 grayscale hover:grayscale-0'
                                            } disabled:opacity-20`}
                                    >
                                        <Save size={18} className="mb-1" />
                                        <span className="text-[9px] font-black uppercase">Producción</span>
                                    </button>
                                    <button
                                        onClick={() => togglePurchase(item.uid)}
                                        disabled={!matches[item.uid]}
                                        className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedPurchases.includes(item.uid)
                                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                            : 'bg-black/20 border-white/5 text-slate-600 grayscale hover:grayscale-0'
                                            } disabled:opacity-20`}
                                    >
                                        <ShoppingCart size={18} className="mb-1" />
                                        <span className="text-[9px] font-black uppercase">Compra</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <AlertTriangle size={48} className="mb-4 text-slate-600" />
                            <p className="text-lg font-bold">No se detectaron platos</p>
                            <p className="text-sm">Intenta subir una foto más clara</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span>{selectedTasks.length} Tareas</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{selectedPurchases.length} Pedidos</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-colors uppercase text-xs tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isSyncing || (selectedTasks.length === 0 && selectedPurchases.length === 0)}
                            onClick={handleSync}
                            className="px-8 py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-primary/20 uppercase text-xs tracking-widest"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    Confirmar y Generar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
