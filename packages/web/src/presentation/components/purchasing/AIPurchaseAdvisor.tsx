import React, { useState } from 'react';
import { Sparkles, Brain, RefreshCw, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { forecastingService } from '@/services/forecastingService';

export const AIPurchaseAdvisor: React.FC = () => {
    const state = useStore();
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [summary, setSummary] = useState('');

    const runAnalysis = async () => {
        if (!state.activeOutletId) {
            setStatus('error');
            return;
        }

        setStatus('analyzing');
        try {
            const data = await forecastingService.getAIPredictions(state.activeOutletId);

            if (data?.suggestions) {
                setSuggestions(data.suggestions);
                setSummary(data.summary || '');
                setStatus('success');
            } else {
                throw new Error('Failed to get recommendations');
            }
        } catch (error) {
            console.error('AI Purchase Analysis Error:', error);
            setStatus('error');
        }
    };

    return (
        <div className="premium-glass overflow-hidden flex flex-col border border-white/5 h-full">
            {/* Header */}
            <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-3 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-glow">
                        <Brain className="text-primary" size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-lg tracking-tight uppercase">AI Purchase Advisor</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Previsión de Compras Inteligente</p>
                    </div>
                </div>
                {status !== 'analyzing' && (
                    <button
                        onClick={runAnalysis}
                        className="p-3 hover:bg-white/5 rounded-2xl text-primary transition-all group border border-transparent hover:border-white/5"
                        title="Refrescar análisis"
                    >
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-6 flex-1 min-h-[400px]">
                {status === 'idle' && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                        <div className="relative">
                            <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
                            <Sparkles className="text-primary relative" size={64} />
                        </div>
                        <div className="max-w-xs space-y-2">
                            <h4 className="text-white font-black text-xl uppercase tracking-tighter">Análisis de Demanda</h4>
                            <p className="text-slate-500 text-xs font-medium leading-relaxed uppercase tracking-wider">
                                Calcularemos tus necesidades basándonos en eventos, mermas y stock actual.
                            </p>
                        </div>
                        <button
                            onClick={runAnalysis}
                            className="px-8 py-3 bg-primary hover:bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 border border-white/10"
                        >
                            Ejecutar Análisis
                        </button>
                    </div>
                )}

                {status === 'analyzing' && (
                    <div className="h-full flex flex-col items-center justify-center space-y-6 py-12">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black uppercase tracking-widest text-xs">Sincronizando Cerebro</p>
                            <p className="text-slate-500 text-[10px] mt-2 animate-pulse uppercase tracking-wider font-bold">Procesando PAX, Recetas y Almacén...</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                        <div className="p-4 bg-red-500/10 rounded-3xl">
                            <AlertTriangle className="text-red-400 font-bold" size={40} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-white font-black uppercase text-sm">Error de Conexión</p>
                            <p className="text-slate-500 text-xs">No hemos podido contactar con el núcleo AI</p>
                        </div>
                        <button onClick={runAnalysis} className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Reintentar Conexión</button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {summary && (
                            <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl flex gap-4 backdrop-blur-md">
                                <Info className="text-primary shrink-0" size={20} />
                                <p className="text-xs text-slate-300 font-medium leading-relaxed italic line-clamp-3">{summary}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Sugerencias Estratégicas</p>
                            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {suggestions.map((item, idx) => (
                                    <div key={idx} className="group relative bg-white/[0.02] hover:bg-white/[0.05] p-5 rounded-3xl border border-white/5 transition-all duration-300">
                                        <div className="flex justify-between items-center relative z-10">
                                            <div className="flex gap-4 items-center">
                                                <div className={`p-3 rounded-2xl ${item.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                                                    {item.priority === 'CRITICAL' ? <AlertTriangle size={18} /> : <TrendingUp size={18} />}
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-black text-white leading-none mb-2 uppercase tracking-tight">{item.ingredientName}</h5>
                                                    <p className="text-[10px] text-slate-500 font-medium italic line-clamp-1">{item.reason}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-white font-mono flex items-center justify-end gap-1">
                                                    {item.quantityToBuy}
                                                    <span className="text-[10px] text-slate-500">{item.unit}</span>
                                                </div>
                                                <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${item.priority === 'CRITICAL' ? 'text-red-400' : 'text-primary'}`}>
                                                    {item.priority === 'CRITICAL' ? 'CRITICO' : 'RECOMENDADO'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute left-0 top-0 w-1 h-0 group-hover:h-full bg-primary transition-all duration-300 rounded-l-3xl opacity-0 group-hover:opacity-100" />
                                    </div>
                                ))}
                                {suggestions.length === 0 && (
                                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                                        <Info className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                                            Sin necesidades detectadas
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {status === 'success' && (
                <div className="p-5 bg-white/[0.02] border-t border-white/5">
                    <div className="flex justify-between items-center">
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">
                            Update: Just now
                        </p>
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black">
                            Predictive Engine v4.2
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

