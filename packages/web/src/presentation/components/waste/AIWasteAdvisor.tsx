import React, { useState } from 'react';
import { Brain, Sparkles, AlertCircle, TrendingDown, Info, RefreshCw, ChevronRight } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { analyzeWaste } from '@/services/geminiService';

export const AIWasteAdvisor: React.FC = () => {
    const { wasteRecords, ingredients } = useStore();
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
    const [insights, setInsights] = useState<any[]>([]);
    const [summary, setSummary] = useState('');
    const [savings, setSavings] = useState('');

    const runAnalysis = async () => {
        if (wasteRecords.length === 0) return;
        setStatus('analyzing');
        try {
            const result = await analyzeWaste(wasteRecords, ingredients);
            if (result.success && result.data) {
                setInsights(result.data.insights || []);
                setSummary(result.data.summary || '');
                setSavings(result.data.estimatedSavings || '');
                setStatus('success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Waste Analysis Error:", error);
            setStatus('error');
        }
    };

    return (
        <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/20 p-3 rounded-2xl border border-indigo-500/30">
                        <Brain className="text-indigo-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            AI Waste Advisor
                            <span className="bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-indigo-500/20">Beta</span>
                        </h3>
                        <p className="text-slate-500 text-xs">Estrategias de reducción basadas en patrones de pérdida</p>
                    </div>
                </div>
                {status !== 'analyzing' && wasteRecords.length > 0 && (
                    <button
                        onClick={runAnalysis}
                        className="p-2 hover:bg-white/5 rounded-xl text-indigo-400 transition-all hover:scale-110"
                    >
                        <RefreshCw size={20} />
                    </button>
                )}
            </div>

            <div className="p-6 flex-1">
                {wasteRecords.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                        <AlertCircle className="text-slate-600" size={48} />
                        <p className="text-slate-500 text-sm max-w-xs">No hay mermas registradas para analizar. Empieza a registrar para ver patrones.</p>
                    </div>
                ) : status === 'idle' ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-16 h-16 bg-indigo-500/5 rounded-full flex items-center justify-center">
                            <Sparkles className="text-indigo-500/30" size={32} />
                        </div>
                        <div className="max-w-sm">
                            <h4 className="text-white font-bold text-lg mb-2">¿Quieres reducir tus pérdidas?</h4>
                            <p className="text-slate-500 text-sm italic">"Un restaurante promedio pierde el 4-10% de su stock antes de que llegue al cliente."</p>
                        </div>
                        <button
                            onClick={runAnalysis}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                        >
                            Analizar Mis Mermas
                        </button>
                    </div>
                ) : status === 'analyzing' ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" size={32} />
                        </div>
                        <div className="text-center">
                            <h4 className="text-white font-bold italic">Buscando patrones invisibles...</h4>
                            <p className="text-slate-500 text-xs mt-1">Cruzando motivos de caducidad y deterioro</p>
                        </div>
                    </div>
                ) : status === 'error' ? (
                    <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="p-4 bg-red-500/10 rounded-full text-red-400">
                            <AlertCircle size={40} />
                        </div>
                        <p className="text-slate-400 text-sm">No pudimos conectar con el consultor de IA.</p>
                        <button onClick={runAnalysis} className="text-indigo-400 font-bold hover:underline">Reintentar Análisis</button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                        {/* Summary Block */}
                        <div className="flex gap-6">
                            <div className="flex-1 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden group">
                                <Info className="absolute -right-2 -bottom-2 text-indigo-500/10 group-hover:scale-125 transition-transform" size={80} />
                                <h4 className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-2">Resumen Ejecutivo</h4>
                                <p className="text-sm text-indigo-100/80 leading-relaxed italic pr-8">{summary}</p>
                            </div>
                            {savings && (
                                <div className="w-48 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <TrendingDown className="text-emerald-400 mb-2" size={24} />
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Ahorro Estimado</p>
                                    <p className="text-xl font-black text-emerald-400 leading-tight">{savings}</p>
                                </div>
                            )}
                        </div>

                        {/* Insights List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recomendaciones del Experto</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {insights.map((insight, idx) => (
                                    <div key={idx} className="bg-white/2 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${insight.severity === 'CRITICAL' ? 'bg-rose-500 animate-pulse' :
                                                        insight.severity === 'MODERATE' ? 'bg-orange-500' : 'bg-emerald-500'
                                                    }`} />
                                                <h5 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors uppercase tabular-nums">P0{idx + 1}</h5>
                                            </div>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${insight.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                                                    insight.severity === 'MODERATE' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {insight.severity}
                                            </span>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <p className="text-white font-semibold text-sm leading-tight">{insight.title}</p>
                                            <p className="text-slate-500 text-[11px] leading-relaxed italic">"{insight.observation}"</p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between group-hover:border-indigo-500/20">
                                            <p className="text-emerald-400 text-xs font-medium pr-4">{insight.recommendation}</p>
                                            <ChevronRight className="text-slate-600 shrink-0" size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/20 border-t border-white/5 text-center">
                <p className="text-[10px] text-slate-600 font-medium">ANÁLISIS GENERADO POR ASISTENTE VIRTUAL GASTRONÓMICO</p>
            </div>
        </div>
    );
};

