import React, { useState } from 'react';
import type { IngredientSupplierConfig, SupplierOption } from '@/types/suppliers';
import { Play, AlertCircle, Trophy } from 'lucide-react';

interface SimulatorProps {
    config: IngredientSupplierConfig;
}

export const SupplierSelectionSimulator: React.FC<SimulatorProps> = ({ config }) => {
    const [winner, setWinner] = useState<SupplierOption | null>(null);
    const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');

    const runSimulation = async () => {
        // We mock the service "get" by saving current config first? 
        // Or we assume service can take config as arg?
        // The service `selectOptimalSupplier` fetches config internally. 
        // Need to temporarily save or mock.
        // For specific UI simulation, let's just create a modified service function or inject.
        // Actually, I'll modify the loop logic here for instant feedback without async fetch overhead 
        // effectively duplicating logic strictly for "Simulation" purposes or expose logic from service.

        // Duplicating logic here for pure UI responsiveness in simulator
        // In real app, share the 'calculateScore' function.

        const available = config.suppliers.filter(s => s.isActive);
        if (available.length === 0) {
            setWinner(null);
            return;
        }

        const normalize = (val: number, min: number, max: number) => {
            if (max === min) return 100;
            return ((val - min) / (max - min)) * 100;
        };

        const prices = available.map(s => s.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const leadTimes = available.map(s => s.leadTimeDays);
        const minLead = Math.min(...leadTimes);
        const maxLead = Math.max(...leadTimes);

        const scored = available.map(supplier => {
            const weights = config.selectionCriteria.weights;
            const priceScore = maxPrice === minPrice ? 100 : 100 - normalize(supplier.price, minPrice, maxPrice);
            const leadTimeScore = maxLead === minLead ? 100 : 100 - normalize(supplier.leadTimeDays, minLead, maxLead);
            const qualityScore = (supplier.qualityRating / 5) * 100;
            const reliabScore = supplier.reliabilityScore;

            const totalScore =
                (priceScore * weights.price) +
                (qualityScore * weights.quality) +
                (reliabScore * weights.reliability) +
                (leadTimeScore * weights.leadTime);

            return { supplier, score: totalScore };
        });

        if (urgency === 'urgent') {
            scored.sort((a, b) => {
                const leadDiff = a.supplier.leadTimeDays - b.supplier.leadTimeDays;
                if (leadDiff !== 0) return leadDiff;
                return b.score - a.score;
            });
        } else {
            scored.sort((a, b) => b.score - a.score);
        }

        setWinner(scored[0]?.supplier || null);
    };

    return (
        <div className="bg-slate-900 text-slate-300 p-6 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Play size={18} className="text-emerald-400" /> Simulador de Compra
                </h3>
                <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="bg-slate-800 border-slate-700 rounded text-sm px-2 py-1"
                >
                    <option value="normal">Pedido Normal</option>
                    <option value="urgent">Pedido Urgente</option>
                </select>
            </div>

            <div className="text-center py-6">
                {winner ? (
                    <div className="animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/50">
                            <Trophy size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-white">{winner.supplierName}</h4>
                        <div className="flex justify-center gap-4 mt-2 text-sm">
                            <span className="text-emerald-400">{winner.price}€ / {winner.unit}</span>
                            <span className="text-blue-400">{winner.leadTimeDays} días</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-500">
                        <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
                        <p>Configura proveedores y pulsa simular.</p>
                    </div>
                )}
            </div>

            <button
                onClick={runSimulation}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors mt-4"
            >
                Simular Decisión IA
            </button>
        </div>
    );
};
