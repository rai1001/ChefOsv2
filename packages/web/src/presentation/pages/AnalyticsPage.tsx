import React, { useState, useMemo } from 'react';
import {
    TrendingUp, Star, BarChart3,
    Target, Trophy, Zap, HelpCircle, PackageX
} from 'lucide-react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList
} from 'recharts';
import { useAnalytics } from '@/application/hooks/useAnalytics';
import { BCGStats } from '@/domain/entities/MenuEngineering';

export const AnalyticsPage: React.FC = () => {
    const { data, loading, refresh } = useAnalytics();
    const [filterType, setFilterType] = useState<string | null>(null);

    const filteredStats = useMemo(() => {
        if (!data) return [];
        if (!filterType) return data.statistics;
        return data.statistics.filter(s => s.type === filterType);
    }, [data, filterType]);

    if (loading) return <div className="p-10 text-white animate-pulse uppercase font-black tracking-widest text-center py-40">Analizando rendimiento del menú...</div>;
    if (!data || data.statistics.length === 0) return (
        <div className="p-10 text-white text-center py-40">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-bold uppercase tracking-tight">No hay datos suficientes para el análisis.</p>
            <p className="text-slate-500 text-sm mt-2">Asegúrate de tener recetas con precios de venta definidos.</p>
        </div>
    );

    const COLORS = {
        star: '#10b981', // emerald
        plowhorse: '#3b82f6', // blue
        puzzle: '#f59e0b', // amber
        dog: '#ef4444' // red
    };

    const typeLabels = {
        star: 'Estrella',
        plowhorse: 'Caballo de Batalla',
        puzzle: 'Enigma',
        dog: 'Perro'
    };

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                        <TrendingUp className="text-primary animate-pulse w-10 h-10" />
                        Ingeniería de Menú
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">Análisis BCG & Rentabilidad</p>
                </div>
                <button
                    onClick={() => refresh()}
                    className="premium-glass px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all border border-white/5 shadow-xl shadow-black/50"
                >
                    Recalcular
                </button>
            </div>

            {/* Matrix Chart & Quick Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 premium-glass rounded-3xl p-6 h-[500px] relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                            <BarChart3 className="text-primary" />
                            Distribución de Platos
                        </h2>
                        <div className="flex gap-4">
                            {Object.entries(COLORS).map(([type, color]) => (
                                <div key={type} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: color }}></div>
                                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{typeLabels[type as keyof typeof typeLabels]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                                <XAxis
                                    type="number"
                                    dataKey="sales"
                                    name="Popularidad"
                                    stroke="#475569"
                                    fontSize={10}
                                    label={{ value: 'Popularidad (Ventas)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="margin"
                                    name="Margen"
                                    stroke="#475569"
                                    fontSize={10}
                                    label={{ value: 'Margen (€)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <ZAxis type="number" dataKey="contribution" range={[100, 600]} name="Contribución" />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const item = payload[0].payload as BCGStats;
                                            return (
                                                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                                                    <p className="text-white font-black uppercase text-xs mb-2 tracking-tight">{item.name}</p>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between gap-8">
                                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Margen:</span>
                                                            <span className="text-[10px] text-white font-mono">{item.margin.toFixed(2)}€</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8">
                                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Ventas:</span>
                                                            <span className="text-[10px] text-white font-mono">{item.sales}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-8 pt-1 border-t border-white/5">
                                                            <span className="text-[10px] text-primary uppercase font-bold text-emerald-400">Total:</span>
                                                            <span className="text-[10px] text-emerald-400 font-mono font-bold">{item.contribution.toFixed(2)}€</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    cursor={{ strokeDasharray: '3 3', stroke: '#ffffff30' }}
                                />
                                <ReferenceLine x={data.averages.popularity} stroke="#ffffff20" strokeDasharray="5 5" />
                                <ReferenceLine y={data.averages.margin} stroke="#ffffff20" strokeDasharray="5 5" />

                                <Scatter name="Recetas" data={data.statistics}>
                                    {data.statistics.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.type]} className="drop-shadow-lg" />
                                    ))}
                                    <LabelList dataKey="name" position="top" style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'black', textTransform: 'uppercase' }} offset={10} />
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 h-full">
                    <div className="premium-glass p-6 rounded-3xl group hover:border-emerald-500/30 transition-all flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-emerald-500/5 rotate-12">
                            <Star size={120} />
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                <Star className="text-emerald-400 w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em]">Stars</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white relative z-10">
                            {data.statistics.filter(s => s.type === 'star').length}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-tight relative z-10">Alta Rentabilidad + Alta Pop.</p>
                    </div>

                    <div className="premium-glass p-6 rounded-3xl group hover:border-blue-500/30 transition-all flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-blue-500/5 rotate-12">
                            <Zap size={120} />
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-blue-500/10 rounded-2xl">
                                <Zap className="text-blue-400 w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em]">Plowhorses</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white relative z-10">
                            {data.statistics.filter(s => s.type === 'plowhorse').length}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-tight relative z-10">Baja Rentabilidad + Alta Pop.</p>
                    </div>

                    <div className="premium-glass p-6 rounded-3xl group hover:border-amber-500/30 transition-all flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-amber-500/5 rotate-12">
                            <HelpCircle size={120} />
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-amber-500/10 rounded-2xl">
                                <HelpCircle className="text-amber-400 w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.2em]">Puzzles</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white relative z-10">
                            {data.statistics.filter(s => s.type === 'puzzle').length}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-tight relative z-10">Alta Rentabilidad + Baja Pop.</p>
                    </div>

                    <div className="premium-glass p-6 rounded-3xl group hover:border-red-500/30 transition-all flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-red-500/5 rotate-12">
                            <PackageX size={120} />
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-red-500/10 rounded-2xl">
                                <PackageX className="text-red-400 w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-red-500/50 uppercase tracking-[0.2em]">Dogs</span>
                        </div>
                        <p className="text-4xl font-mono font-black text-white relative z-10">
                            {data.statistics.filter(s => s.type === 'dog').length}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-tight relative z-10">Baja Rentabilidad + Baja Pop.</p>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="premium-glass rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-white/5 gap-4">
                    <h3 className="font-black text-xl text-white flex items-center gap-3 uppercase tracking-tighter">
                        <Target size={24} className="text-primary" />
                        Desglose Estratégico
                    </h3>
                    <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-x-auto max-w-full">
                        <button
                            onClick={() => setFilterType(null)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!filterType ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Todos
                        </button>
                        {Object.entries(COLORS).map(([type, color]) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterType === type ? 'bg-white/10 text-white border border-white/10' : 'text-slate-600 hover:text-white'}`}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                                {typeLabels[type as keyof typeof typeLabels]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/30 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                            <tr>
                                <th className="p-6">Receta / Plato</th>
                                <th className="p-6 text-center">Clasificación</th>
                                <th className="p-6 text-right">Margen Uni.</th>
                                <th className="p-6 text-right">Ventas</th>
                                <th className="p-6 text-right">Contribución Bruta</th>
                                <th className="p-6 text-center">Estrategia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStats.map(s => (
                                <tr key={s.id} className="hover:bg-white/10 transition-colors group">
                                    <td className="p-6 font-black text-white uppercase tracking-tight text-sm">
                                        {s.name}
                                        <div className="w-0 group-hover:w-full h-px bg-primary transition-all duration-500 mt-1 opacity-50"></div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2`} style={{ backgroundColor: `${COLORS[s.type]}15`, color: COLORS[s.type], border: `1px solid ${COLORS[s.type]}25` }}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[s.type] }}></div>
                                                {typeLabels[s.type]}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right font-mono text-sm text-slate-300 font-bold">{s.margin.toFixed(2)}€</td>
                                    <td className="p-6 text-right font-mono text-sm text-slate-300 font-bold">{s.sales.toFixed(0)} <span className="text-[10px] font-normal text-slate-500 uppercase tracking-tighter">u</span></td>
                                    <td className="p-6 text-right font-mono font-black text-white text-lg bg-white/[0.02] shadow-inner">{s.contribution.toFixed(2)}€</td>
                                    <td className="p-6 text-center">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">
                                            {s.type === 'star' && <><Trophy size={14} className="text-emerald-400" /> Promocionar Lux</>}
                                            {s.type === 'plowhorse' && <><TrendingUp size={14} className="text-blue-400" /> Optimizar Coste</>}
                                            {s.type === 'puzzle' && <><Target size={14} className="text-amber-400" /> Forzar Venta</>}
                                            {s.type === 'dog' && <><PackageX size={14} className="text-red-400" /> Eliminar Menú</>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 bg-black/40 border-t border-white/5 flex justify-between items-center">
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contribución Total</p>
                            <p className="text-3xl font-mono font-black text-white">{data.totals.contribution.toFixed(2)}€</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volumen Total</p>
                            <p className="text-3xl font-mono font-black text-white">{data.totals.volume} <span className="text-sm font-normal text-slate-500">unidades</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
