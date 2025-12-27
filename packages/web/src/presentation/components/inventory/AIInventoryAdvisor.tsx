import React, { useState } from 'react';
import { Sparkles, Brain, Check, X, Info, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { inventoryAnalyticsService } from '@/services/inventoryAnalytics';
import { optimizeInventorySettings } from '@/services/geminiService';
import { updateDocument } from '@/services/firestoreService';
import { COLLECTION_NAMES } from '@/config/collections';

interface Recommendation {
    ingredientId: string;
    ingredientName: string;
    suggestedReorderPoint: number;
    suggestedOptimalStock: number;
    reasoning: string;
    trend: 'UP' | 'DOWN' | 'STABLE';
}

interface AIAdvisorProps {
    outletId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const AIInventoryAdvisor: React.FC<AIAdvisorProps> = ({ outletId, isOpen, onClose }) => {
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [globalAnalysis, setGlobalAnalysis] = useState('');
    const [applying, setApplying] = useState<string | null>(null);

    const runAnalysis = async () => {
        setStatus('analyzing');
        try {
            const context = await inventoryAnalyticsService.getInventoryContext(outletId);
            const result = await optimizeInventorySettings(context);

            if (result.success && result.data) {
                setRecommendations(result.data.recommendations || []);
                setGlobalAnalysis(result.data.globalAnalysis || '');
                setStatus('success');
            } else {
                throw new Error(result.error || 'Failed to get recommendations');
            }
        } catch (error) {
            console.error('AI Analysis Error:', error);
            setStatus('error');
        }
    };

    const handleApply = async (rec: Recommendation) => {
        setApplying(rec.ingredientId);
        try {
            await updateDocument(COLLECTION_NAMES.INGREDIENTS, rec.ingredientId, {
                reorderPoint: rec.suggestedReorderPoint,
                optimalStock: rec.suggestedOptimalStock,
                updatedAt: new Date().toISOString()
            });
            // Update local list
            setRecommendations(prev => prev.filter(r => r.ingredientId !== rec.ingredientId));
        } catch (error) {
            console.error('Error applying recommendation:', error);
        } finally {
            setApplying(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/20 p-2.5 rounded-2xl border border-indigo-500/30">
                            <Brain className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                AI Inventory Advisor
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-indigo-500/30">
                                    Gemini 2.0
                                </span>
                            </h3>
                            <p className="text-slate-400 text-xs">Predicciones inteligentes basadas en consumo y eventos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/50">
                    {status === 'idle' && (
                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center animate-pulse">
                                <Sparkles className="text-indigo-500/30" size={40} />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-white">¿Listo para optimizar?</h4>
                                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                    Analizaremos los últimos 30 días de consumo y los eventos de las próximas 2 semanas para ajustar tus niveles de stock.
                                </p>
                            </div>
                            <button
                                onClick={runAnalysis}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                            >
                                <RefreshCw size={18} /> Iniciar Análisis
                            </button>
                        </div>
                    )}

                    {status === 'analyzing' && (
                        <div className="h-64 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={32} />
                            </div>
                            <div className="text-center">
                                <h4 className="text-lg font-bold text-white">Procesando Inteligencia...</h4>
                                <p className="text-slate-500 text-sm animate-pulse">Consultando histórico de consumo y mermas</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="bg-rose-500/20 p-4 rounded-full">
                                <AlertCircle className="text-rose-400" size={40} />
                            </div>
                            <h4 className="text-lg font-bold text-white">Error en el análisis</h4>
                            <p className="text-slate-500 text-sm">No pudimos conectar con los servicios de IA en este momento.</p>
                            <button onClick={runAnalysis} className="text-indigo-400 font-bold hover:underline">Reintentar</button>
                        </div>
                    )}

                    {status === 'success' && (
                        <>
                            {globalAnalysis && (
                                <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex gap-4">
                                    <Info className="text-indigo-400 shrink-0" size={24} />
                                    <p className="text-sm text-indigo-100/80 italic leading-relaxed">{globalAnalysis}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Recomendaciones sugeridas ({recommendations.length})</h5>
                                <div className="grid gap-4">
                                    {recommendations.map(rec => (
                                        <div key={rec.ingredientId} className="p-5 bg-white/2 border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h6 className="font-bold text-white truncate max-w-[200px]">{rec.ingredientName}</h6>
                                                        {rec.trend === 'UP' && <TrendingUp size={14} className="text-emerald-400" />}
                                                        {rec.trend === 'DOWN' && <TrendingDown size={14} className="text-rose-400" />}
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-snug">{rec.reasoning}</p>
                                                </div>

                                                <div className="flex items-center gap-6 text-center">
                                                    <div>
                                                        <p className="text-[10px] text-slate-600 uppercase font-bold mb-1">Reorder Pt</p>
                                                        <p className="text-indigo-400 font-bold tabular-nums">{rec.suggestedReorderPoint}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-600 uppercase font-bold mb-1">Opt. Stock</p>
                                                        <p className="text-purple-400 font-bold tabular-nums">{rec.suggestedOptimalStock}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleApply(rec)}
                                                        disabled={applying === rec.ingredientId}
                                                        className="p-3 bg-white/5 text-emerald-400 rounded-xl hover:bg-emerald-500/10 border border-white/10 transition-all hover:scale-105"
                                                    >
                                                        {applying === rec.ingredientId ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {recommendations.length === 0 && (
                                        <div className="p-12 text-center text-slate-600 border border-dashed border-white/5 rounded-2xl">
                                            Tu inventario está optimizado. No se sugieren cambios.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-slate-900 flex justify-between items-center">
                    <p className="text-[10px] text-slate-600 max-w-sm">
                        * Las sugerencias de la IA son aproximaciones estadísticas. Revisa siempre antes de aplicar cambios críticos a tu operativa.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors text-sm">Ignorar</button>
                        {status === 'success' && recommendations.length > 0 && (
                            <button
                                onClick={async () => {
                                    for (const rec of recommendations) await handleApply(rec);
                                }}
                                className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all text-sm"
                            >
                                Aplicar Todas
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
