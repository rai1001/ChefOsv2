/**
 * @file src/components/fichas/KPICard.tsx
 */
import React from 'react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'yellow';
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color }) => {
    const colorMaps = {
        blue: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
        green: 'from-green-500/20 to-green-600/5 text-green-400 border-green-500/20',
        purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
        yellow: 'from-yellow-500/20 to-yellow-600/5 text-yellow-400 border-yellow-500/20',
    };

    return (
        <div className={`bg-gradient-to-br ${colorMaps[color]} border rounded-2xl p-6 transition-all hover:scale-[1.02] duration-300 shadow-xl`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    {icon}
                </div>
            </div>
            <div>
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest">{title}</h4>
                <p className="text-2xl font-black text-white mt-1">{value}</p>
            </div>
        </div>
    );
};

/**
 * @file src/components/fichas/FiltrosFichas.tsx
 */
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export interface FilterState {
    searchTerm: string;
    categoria: string[];
    dificultad: string[];
    rangoCoste: [number, number];
    rangoMargen: [number, number];
    soloActivas: boolean;
}

interface FiltrosProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
}

export const FiltrosFichas: React.FC<FiltrosProps> = ({ filters, onChange }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-t border-white/5 pt-4">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors mb-4 group"
            >
                <Filter className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                Filtros Avanzados
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expanded && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Categoría */}
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Categorías</label>
                        <div className="flex flex-wrap gap-2">
                            {['comida', 'bebida', 'postre', 'ingrediente-preparado'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        const newCat = filters.categoria.includes(cat)
                                            ? filters.categoria.filter(c => c !== cat)
                                            : [...filters.categoria, cat];
                                        onChange({ ...filters, categoria: newCat });
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filters.categoria.includes(cat)
                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                        }`}
                                >
                                    {cat.replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dificultad */}
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Dificultad</label>
                        <div className="flex flex-col gap-2">
                            {['baja', 'media', 'alta'].map(dif => (
                                <label key={dif} className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                        checked={filters.dificultad.includes(dif)}
                                        onChange={(e) => {
                                            const newDif = e.target.checked
                                                ? [...filters.dificultad, dif]
                                                : filters.dificultad.filter(d => d !== dif);
                                            onChange({ ...filters, dificultad: newDif });
                                        }}
                                    />
                                    <span className={`text-sm capitalize transition-colors ${filters.dificultad.includes(dif) ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                        {dif}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Rango de Coste */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coste Máx p/p</label>
                            <span className="text-xs font-mono text-primary">{filters.rangoCoste[1]}€</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.rangoCoste[1]}
                            onChange={(e) => onChange({
                                ...filters,
                                rangoCoste: [filters.rangoCoste[0], Number(e.target.value)]
                            })}
                            className="w-full accent-primary bg-white/5 h-1.5 rounded-lg border-none outline-none cursor-pointer"
                        />
                    </div>

                    {/* Rango de Margen */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Margen Mínimo</label>
                            <span className="text-xs font-mono text-green-400">{filters.rangoMargen[0]}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={filters.rangoMargen[0]}
                            onChange={(e) => onChange({
                                ...filters,
                                rangoMargen: [Number(e.target.value), filters.rangoMargen[1]]
                            })}
                            className="w-full accent-green-500 bg-white/5 h-1.5 rounded-lg border-none outline-none cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
