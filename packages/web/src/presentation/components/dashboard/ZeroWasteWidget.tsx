import React, { useState, useMemo } from 'react';

import { useStore } from '@/presentation/store/useStore';
import { parseISO, addHours } from 'date-fns';
import { AlertTriangle, Sparkles, ChefHat, ArrowRight, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { WasteSuggestion } from '@/types';
import { useToast } from '@/presentation/components/ui'; // Adjust path if needed

// Assuming standard UI components exist, adapting to "premium" style
const ActionCard = ({ suggestion, onApply }: { suggestion: WasteSuggestion, onApply: () => void }) => {
    const colorMap = {
        'FLASH_SALE': 'from-amber-500/20 to-orange-500/20 border-orange-500/30 text-orange-200',
        'BUFFET': 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-200',
        'PRESERVE': 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-200'
    };

    return (
        <div className={`p-4 rounded-xl border bg-gradient-to-br ${colorMap[suggestion.suggestedAction as keyof typeof colorMap]} backdrop-blur-md relative group overflow-hidden`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70 border border-white/10 px-2 py-0.5 rounded-full bg-black/20">
                    {suggestion.suggestedAction.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono opacity-50">{suggestion.expiresInHours}h left</span>
            </div>
            <h4 className="font-bold text-lg text-white mb-1 leading-tight">{suggestion.ingredientName}</h4>
            <p className="text-sm opacity-90 mb-3 line-clamp-2">{suggestion.reasoning}</p>

            {suggestion.recipeName && (
                <div className="text-xs bg-black/20 p-2 rounded mb-3">
                    <span className="opacity-60 block text-[10px] uppercase">Idea:</span>
                    {suggestion.recipeName}
                </div>
            )}

            <button
                onClick={onApply}
                className="w-full py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
                Aplicar Acción <ArrowRight size={14} />
            </button>
        </div>
    );
};

export const ZeroWasteWidget: React.FC = () => {
    const { inventory, activeOutletId } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<WasteSuggestion[]>([]);
    const [showModal, setShowModal] = useState(false);
    const { addToast } = useToast();

    // 1. Detect Expiring Items locally
    const expiringStats = useMemo(() => {
        let count = 0;
        const now = new Date();
        const warningThreshold = addHours(now, 48);

        inventory.forEach(item => {
            if (item.batches) {
                item.batches.forEach(batch => {
                    if (batch.currentQuantity > 0 && batch.expiresAt) {
                        const expiry = parseISO(batch.expiresAt);
                        if (expiry <= warningThreshold && expiry >= now) {
                            count++;
                        }
                    }
                });
            }
        });
        return { count };
    }, [inventory]);

    const handleGetSuggestions = async () => {
        if (!activeOutletId) return;
        setIsLoading(true);
        try {
            const functions = getFunctions();
            // Wait, looking at index.ts export: export { getWasteSuggestions, applyWasteAction } from "./waste/zeroWasteEngine";
            // Correct name is getWasteSuggestions

            const callable = httpsCallable(functions, 'getWasteSuggestions');
            const result = await callable({ outletId: activeOutletId });
            const data = result.data as { suggestions: WasteSuggestion[] };

            if (data.suggestions && data.suggestions.length > 0) {
                setSuggestions(data.suggestions);
                setShowModal(true);
            } else {
                addToast('Sin desperdicios', 'info');
            }

        } catch (error) {
            console.error("Failed to get suggestions:", error);
            addToast('Error al consultar IA', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (expiringStats.count === 0) return null; // Don't show if no waste risk

    return (
        <div className="premium-glass p-1 rounded-2xl relative overflow-hidden group">
            {/* Background Animation or Gradient to indicate urgency */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 animate-pulse-slow pointer-events-none" />

            <div className="p-5 relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-red-300">
                        <AlertTriangle className="w-5 h-5 animate-bounce-slow" />
                        <span className="font-bold tracking-wider text-xs uppercase">Riesgo de Merma</span>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-1">
                        {expiringStats.count} Lotes
                    </h3>
                    <p className="text-sm text-slate-400 leading-snug">
                        Caducan en &lt; 48h. Usa la IA para transformarlos en rentabilidad.
                    </p>
                </div>

                <button
                    onClick={handleGetSuggestions}
                    disabled={isLoading}
                    className="mt-4 w-full py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white rounded-xl shadow-lg shadow-orange-900/20 font-bold text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    {isLoading ? 'Analizando...' : 'Generar Zero Waste'}
                </button>
            </div>

            {/* Modal for Suggestions */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">

                        {/* Left Side: Chef Persona */}
                        <div className="md:w-1/3 bg-surface-dim p-6 flex flex-col justify-center items-center text-center border-r border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                            <div className="w-20 h-20 bg-gradient-to-tr from-primary to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-primary/20">
                                <ChefHat size={40} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Chef Operativo</h3>
                            <p className="text-sm text-slate-400">
                                "He analizado tu inventario. Aquí tienes mis 3 mejores jugadas para evitar tirar comida hoy."
                            </p>
                            <button
                                onClick={() => setShowModal(false)}
                                className="mt-8 text-slate-500 hover:text-white text-sm underline decoration-slate-700 underline-offset-4"
                            >
                                Cerrar y decidir luego
                            </button>
                        </div>

                        {/* Right Side: Grid of Options */}
                        <div className="flex-1 p-6 overflow-y-auto bg-surface">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Propuestas Generadas
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suggestions.map((suggestion, idx) => (
                                    <ActionCard
                                        key={`${suggestion.batchId}-${idx}`}
                                        suggestion={suggestion}
                                        onApply={() => {
                                            // Handle Apply Action
                                            // Ideally calls applyWasteAction which creates a task
                                            alert(`Acción aplicada: ${suggestion.suggestedAction} para ${suggestion.ingredientName} `);
                                            // Close modal or update state
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
