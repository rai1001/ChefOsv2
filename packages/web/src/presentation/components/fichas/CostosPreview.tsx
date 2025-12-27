/**
 * @file src/components/fichas/CostosPreview.tsx
 * @description Component for real-time visualization of recipe costs and margins.
 */

import React from 'react';
import { TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { calcularSugerenciaPrecio } from '@/utils/precioCalculator';
import type { FichaTecnica } from '@/types';

interface Props {
    costos: FichaTecnica['costos'];
    pricing: FichaTecnica['pricing'];
    onUpdatePricing: (updates: Partial<FichaTecnica['pricing']>) => void;
}

export const CostosPreview: React.FC<Props> = ({
    costos,
    pricing,
    onUpdatePricing
}) => {
    const sugerencia = calcularSugerenciaPrecio(costos.porPorcion, pricing.margenObjetivo);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Costo Base */}
            <div className="bg-surface p-6 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <DollarSign className="w-4 h-4 text-blue-400" />
                    <span>Costo Producción</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{costos.total.toFixed(2)}€</span>
                    <span className="text-xs text-slate-500">total</span>
                </div>
                <div className="text-sm text-slate-500 pt-2 border-t border-white/5">
                    Costo por porción: <span className="text-blue-400 font-medium">{costos.porPorcion.toFixed(2)}€</span>
                </div>
            </div>

            {/* Margen y Rentabilidad */}
            <div className="bg-surface p-6 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <PieChart className="w-4 h-4 text-purple-400" />
                        <span>Margen Objetivo</span>
                    </div>
                    <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded">
                        <input
                            type="number"
                            className="w-10 bg-transparent text-sm text-right focus:outline-none"
                            value={pricing.margenObjetivo}
                            onChange={e => onUpdatePricing({ margenObjetivo: Number(e.target.value) })}
                        />
                        <span className="text-[10px] text-slate-500">%</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Rentabilidad real:</span>
                        <span className="text-purple-400 font-medium">{sugerencia.rentabilidad}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${sugerencia.rentabilidad}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Precio Sugerido */}
            <div className="bg-primary/10 p-6 rounded-xl border border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-primary/80 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>Precio Venta Sugerido</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{sugerencia.precioVentaSugerido.toFixed(2)}€</span>
                    <span className="text-xs text-slate-500">+ IVA</span>
                </div>
                <div className="text-xs text-slate-400 pt-2">
                    Margen bruto por plato: <span className="text-white font-medium">{sugerencia.margenBruto.toFixed(2)}€</span>
                </div>
            </div>
        </div>
    );
};
