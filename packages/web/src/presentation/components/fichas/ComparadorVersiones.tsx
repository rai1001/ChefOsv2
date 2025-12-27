/**
 * @file src/components/fichas/ComparadorVersiones.tsx
 * @description Component to compare two versions of a Ficha Técnica.
 */

import React from 'react';
import { ArrowLeftRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { FichaTecnica } from '@/types';

interface Props {
    v1: FichaTecnica;
    v2: FichaTecnica;
    onClose: () => void;
}

export const ComparadorVersiones: React.FC<Props> = ({ v1, v2, onClose }) => {
    const diffCosto = v2.costos.total - v1.costos.total;
    const percChange = (diffCosto / v1.costos.total) * 100;

    return (
        <div className="bg-surface-light rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
            <header className="px-6 py-4 bg-surface border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <ArrowLeftRight className="w-5 h-5 text-primary" />
                    <div>
                        <h3 className="text-lg font-bold text-white">Comparador de Versiones</h3>
                        <p className="text-xs text-slate-500">Comparando v{v1.version} con v{v2.version}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-sm">Cerrar</button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Resumen de Costos */}
                <section className="grid grid-cols-2 gap-8 relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2" />

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Versión {v1.version}</h4>
                        <div className="bg-surface p-4 rounded-xl border border-white/5 text-center">
                            <p className="text-2xl font-bold text-white">{v1.costos.porPorcion.toFixed(2)}€</p>
                            <p className="text-[10px] text-slate-500 uppercase">por porción</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Versión {v2.version}</h4>
                        <div className={`p-4 rounded-xl border text-center transition-all ${diffCosto > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
                            }`}>
                            <p className="text-2xl font-bold text-white">{v2.costos.porPorcion.toFixed(2)}€</p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                                {diffCosto > 0 ? (
                                    <TrendingUp className="w-3 h-3 text-red-400" />
                                ) : diffCosto < 0 ? (
                                    <TrendingDown className="w-3 h-3 text-green-400" />
                                ) : (
                                    <Minus className="w-3 h-3 text-slate-400" />
                                )}
                                <span className={`text-[10px] font-bold ${diffCosto > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {percChange.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Detalle Ingredientes */}
                <section className="space-y-4">
                    <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">Comparativa de Ingredientes</h4>
                    <div className="grid grid-cols-2 gap-8 relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2" />

                        <div className="space-y-2">
                            {v1.ingredientes.map(ing => (
                                <div key={ing.ingredienteId} className="flex justify-between items-center text-sm p-2 bg-surface rounded-lg border border-white/5">
                                    <span className="text-slate-300 truncate pr-2">{ing.nombre}</span>
                                    <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{ing.cantidad} {ing.unidad}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {v2.ingredientes.map(ing => {
                                const original = v1.ingredientes.find(i => i.ingredienteId === ing.ingredienteId);
                                const hasChanged = !original || original.cantidad !== ing.cantidad;

                                return (
                                    <div key={ing.ingredienteId} className={`flex justify-between items-center text-sm p-2 rounded-lg border ${hasChanged ? 'bg-primary/10 border-primary/30' : 'bg-surface border-white/5'
                                        }`}>
                                        <span className="text-slate-300 truncate pr-2">{ing.nombre}</span>
                                        <span className="text-xs font-mono text-slate-200 whitespace-nowrap">{ing.cantidad} {ing.unidad}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
