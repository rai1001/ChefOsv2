import React from 'react';
import { DollarSign, TrendingDown, AlertCircle } from 'lucide-react';
import type { WasteRecord } from '@/types';

interface WasteDashboardProps {
    wasteRecords: WasteRecord[];
}

const reasonLabels: Record<string, string> = {
    'CADUCIDAD': 'Caducidad',
    'ELABORACION': 'Error Elaboración',
    'DETERIORO': 'Deterioro',
    'EXCESO_PRODUCCION': 'Exceso Producción',
    'OTROS': 'Otros'
};

const reasonColors: Record<string, string> = {
    'CADUCIDAD': 'bg-red-500',
    'ELABORACION': 'bg-orange-500',
    'DETERIORO': 'bg-amber-500',
    'EXCESO_PRODUCCION': 'bg-blue-500',
    'OTROS': 'bg-slate-500'
};

export const WasteDashboard: React.FC<WasteDashboardProps> = ({ wasteRecords }) => {
    // Calculate KPIs
    const totalWasteValue = wasteRecords.reduce((acc, r) => acc + (r.quantity * r.costAtTime), 0);

    const wasteByReason = wasteRecords.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + (r.quantity * r.costAtTime);
        return acc;
    }, {} as Record<string, number>);

    // Today's waste
    const today = new Date().toISOString().split('T')[0] || '';
    const todayWaste = wasteRecords
        .filter(r => r.date.startsWith(today))
        .reduce((acc, r) => acc + (r.quantity * r.costAtTime), 0);

    // This week's waste
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekWaste = wasteRecords
        .filter(r => r.date >= weekAgo)
        .reduce((acc, r) => acc + (r.quantity * r.costAtTime), 0);

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-slate-400">Merma Total</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{totalWasteValue.toFixed(2)}€</p>
                    <p className="text-sm text-slate-500 mt-2">{wasteRecords.length} registros totales</p>
                </div>

                <div className="bg-surface border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-slate-400">Esta Semana</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{weekWaste.toFixed(2)}€</p>
                    <p className="text-sm text-slate-500 mt-2">Últimos 7 días</p>
                </div>

                <div className="bg-surface border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <AlertCircle size={24} />
                        </div>
                        <span className="text-slate-400">Hoy</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{todayWaste.toFixed(2)}€</p>
                    <p className="text-sm text-slate-500 mt-2">{new Date().toLocaleDateString('es-ES')}</p>
                </div>
            </div>

            {/* Breakdown by Reason */}
            <div className="bg-surface border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6 text-white">Desglose por Motivo</h3>
                <div className="space-y-4">
                    {Object.entries(wasteByReason)
                        .sort(([, a], [, b]) => b - a)
                        .map(([reasonKey, value]) => {
                            const percentage = totalWasteValue > 0 ? (value / totalWasteValue) * 100 : 0;
                            return (
                                <div key={reasonKey} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">{reasonLabels[reasonKey] || reasonKey}</span>
                                        <span className="text-white font-mono">{value.toFixed(2)}€ ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${reasonColors[reasonKey] || 'bg-slate-500'} transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    {Object.keys(wasteByReason).length === 0 && (
                        <p className="text-center text-slate-500 py-8">No hay datos suficientes para mostrar el desglose.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
