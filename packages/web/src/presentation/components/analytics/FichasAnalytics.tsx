/**
 * @file src/components/analytics/RentabilidadCharts.tsx
 */
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';

interface ChartProps {
    data: any[];
}

export const MarginDistributionChart: React.FC<ChartProps> = ({ data }) => (
    <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="categoria" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="margen" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.margen >= 70 ? '#22c55e' : entry.margen >= 50 ? '#eab308' : '#ef4444'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export const CostVsMarginScatter: React.FC<ChartProps> = ({ data }) => (
    <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis type="number" dataKey="costo" name="Costo" unit="€" stroke="#94a3b8" label={{ value: 'Costo por Porción', position: 'insideBottom', offset: -10, fill: '#64748b' }} />
                <YAxis type="number" dataKey="margen" name="Margen" unit="%" stroke="#94a3b8" label={{ value: 'Margen (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                <Scatter name="Fichas" data={data} fill="#3b82f6">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.margen >= 60 ? '#22c55e' : '#ef4444'} />
                    ))}
                </Scatter>
            </ScatterChart>
        </ResponsiveContainer>
    </div>
);

/**
 * @file src/components/analytics/ComparadorPlatos.tsx
 */
import { useState } from 'react';
import Select from 'react-select';
import type { FichaTecnica } from '@/types';
import { TrendingUp, Target, Clock, Coins } from 'lucide-react';

export const ComparadorPlatos: React.FC<{ fichas: FichaTecnica[] }> = ({ fichas }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const selectedFichas = fichas.filter(f => selectedIds.includes(f.id));

    return (
        <div className="bg-surface-light border border-white/5 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/10 rounded-lg">
                    <Target className="text-green-400 w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Comparador de Rendimiento</h2>
            </div>

            <div className="mb-8">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Selecciona platos para comparar (2-4)</label>
                <Select
                    isMulti
                    options={fichas.map(f => ({ value: f.id, label: f.nombre }))}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                        control: (base: any) => ({
                            ...base,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '6px',
                            color: 'white'
                        }),
                        menu: (base: any) => ({ ...base, backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }),
                        option: (base: any, state: any) => ({ ...base, backgroundColor: state.isFocused ? 'rgba(255,255,255,0.05)' : 'transparent' }),
                        multiValue: (base: any) => ({ ...base, backgroundColor: '#3b82f6', borderRadius: '8px' }),
                        multiValueLabel: (base: any) => ({ ...base, color: 'white', fontWeight: 'bold' }),
                    }}
                    onChange={(val: any) => setSelectedIds(val.map((v: any) => v.value))}
                />
            </div>

            {selectedFichas.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Metrics Table */}
                    <div className="space-y-4">
                        <div className="overflow-hidden rounded-2xl border border-white/5">
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Métrica</th>
                                        {selectedFichas.map(f => (
                                            <th key={f.id} className="p-4 text-[10px] font-black text-slate-300 uppercase text-center">{f.nombre}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr>
                                        <td className="p-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><Coins size={14} /> Costo p/p</td>
                                        {selectedFichas.map(f => <td key={f.id} className="p-4 text-sm font-mono text-center text-white">{f.costos.porPorcion.toFixed(2)}€</td>)}
                                    </tr>
                                    <tr>
                                        <td className="p-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><TrendingUp size={14} /> Margen</td>
                                        {selectedFichas.map(f => <td key={f.id} className="p-4 text-sm font-mono text-center text-green-400 font-bold">{f.pricing.margenBruto?.toFixed(0)}%</td>)}
                                    </tr>
                                    <tr>
                                        <td className="p-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><Clock size={14} /> Prep.</td>
                                        {selectedFichas.map(f => <td key={f.id} className="p-4 text-sm font-mono text-center text-slate-300">{f.tiempoPreparacion}m</td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="h-[350px] bg-white/5 rounded-3xl p-4 flex items-center justify-center border border-white/10 shadow-inner">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                { metric: 'Rentabilidad', ...selectedFichas.reduce((acc, f) => ({ ...acc, [f.nombre]: f.pricing.margenBruto }), {}) },
                                { metric: 'Eficiencia Costo', ...selectedFichas.reduce((acc, f) => ({ ...acc, [f.nombre]: 100 - (f.costos.porPorcion * 5) }), {}) },
                                { metric: 'Velocidad Prep', ...selectedFichas.reduce((acc, f) => ({ ...acc, [f.nombre]: 100 - (f.tiempoPreparacion / 2) }), {}) },
                                { metric: 'Simplicidad', ...selectedFichas.reduce((acc, f) => ({ ...acc, [f.nombre]: f.dificultad === 'baja' ? 100 : f.dificultad === 'media' ? 60 : 30 }), {}) }
                            ]}>
                                <PolarGrid stroke="#ffffff20" />
                                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                                {selectedFichas.map((f, i) => (
                                    <Radar key={f.id} name={f.nombre} dataKey={f.nombre} stroke={['#3b82f6', '#22c55e', '#eab308', '#ec4899'][i % 4]} fill={['#3b82f6', '#22c55e', '#eab308', '#ec4899'][i % 4]} fillOpacity={0.3} />
                                ))}
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Selecciona platos para visualizar la comparativa</p>
                </div>
            )}
        </div>
    );
};
