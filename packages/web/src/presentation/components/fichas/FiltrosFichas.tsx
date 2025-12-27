import React from 'react';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import type { FichaCategoria, FichaDificultad } from '@/types/fichasTecnicas';

export interface FilterState {
    searchTerm: string;
    categoria: FichaCategoria[];
    dificultad: FichaDificultad[];
    rangoCoste: [number, number];
    rangoMargen: [number, number];
    soloActivas: boolean;
}

interface FiltrosFichasProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export const FiltrosFichas: React.FC<FiltrosFichasProps> = ({ filters, onChange, isOpen, onToggle }) => {
    const toggleCategoria = (cat: FichaCategoria) => {
        const newCats = filters.categoria.includes(cat)
            ? filters.categoria.filter(c => c !== cat)
            : [...filters.categoria, cat];
        onChange({ ...filters, categoria: newCats });
    };

    const toggleDificultad = (dif: FichaDificultad) => {
        const newDifs = filters.dificultad.includes(dif)
            ? filters.dificultad.filter(d => d !== dif)
            : [...filters.dificultad, dif];
        onChange({ ...filters, dificultad: newDifs });
    };

    const clearFilters = () => {
        onChange({
            ...filters,
            categoria: [],
            dificultad: [],
            rangoCoste: [0, 100],
            rangoMargen: [0, 100],
            soloActivas: true
        });
    };

    return (
        <div className="mt-4">
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 text-sm font-medium transition-all px-3 py-2 rounded-lg border ${isOpen
                    ? 'text-primary bg-primary/10 border-primary/20'
                    : 'text-slate-400 hover:text-slate-200 bg-white/5 border-white/5 hover:border-white/10'
                    }`}
            >
                <SlidersHorizontal className="w-4 h-4" />
                {isOpen ? 'Ocultar Filtros' : 'Filtros Avanzados'}
                {(filters.categoria.length > 0 || filters.dificultad.length > 0) && (
                    <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                        {filters.categoria.length + filters.dificultad.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="mt-4 p-6 bg-background/50 border border-white/5 rounded-xl animate-fade-in-down backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5" />
                            Configuración de Filtros
                        </h4>
                        <button
                            onClick={clearFilters}
                            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-2 py-1 hover:bg-rose-500/10 rounded-md transition-all"
                        >
                            <X className="w-3.5 h-3.5" /> Limpiar Todo
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Categorías */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase mb-3 block tracking-wider">Categoría</label>
                            <div className="space-y-2.5">
                                {['comida', 'bebida', 'postre', 'ingrediente-preparado'].map((cat) => (
                                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filters.categoria.includes(cat as FichaCategoria)}
                                                onChange={() => toggleCategoria(cat as FichaCategoria)}
                                                className="peer h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-background"
                                            />
                                        </div>
                                        <span className="text-sm text-slate-400 capitalize group-hover:text-slate-200 transition-colors">
                                            {cat.replace('-', ' ')}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Dificultad */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase mb-3 block tracking-wider">Dificultad</label>
                            <div className="space-y-2.5">
                                {['baja', 'media', 'alta'].map((dif) => (
                                    <label key={dif} className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={filters.dificultad.includes(dif as FichaDificultad)}
                                            onChange={() => toggleDificultad(dif as FichaDificultad)}
                                            className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-background"
                                        />
                                        <span className="text-sm text-slate-400 capitalize group-hover:text-slate-200 transition-colors">{dif}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Estado */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase mb-3 block tracking-wider">Estado</label>
                            <div className="space-y-2.5">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={filters.soloActivas}
                                        onChange={(e) => onChange({ ...filters, soloActivas: e.target.checked })}
                                        className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-background"
                                    />
                                    <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Solo Fichas Activas</span>
                                </label>
                            </div>
                        </div>

                        {/* Note: Sliders for cost and margin omitted for MVP speed */}
                    </div>
                </div>
            )}
        </div>
    );
};
