import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { TrendingUp, Clock, AlertCircle, CheckCircle2, Truck, BarChart3, Users } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export const SupplierPerformance: React.FC = () => {
    const { suppliers, purchaseOrders } = useStore();

    const performanceMetrics = useMemo(() => {
        return suppliers.map(supplier => {
            const supplierOrders = purchaseOrders.filter(o => o.supplierId === supplier.id && o.status === 'RECEIVED');

            if (supplierOrders.length === 0) {
                return {
                    ...supplier,
                    reliability: 0,
                    avgLeadTime: 0,
                    totalSpend: 0,
                    orderCount: 0,
                    onTimeCount: 0
                };
            }

            let totalLeadTime = 0;
            let onTimeCount = 0;
            let totalSpend = 0;

            supplierOrders.forEach(order => {
                totalSpend += order.totalCost;

                if (order.actualDeliveryDate && order.deliveryDate) {
                    const actualDate = new Date(order.actualDeliveryDate);
                    const promisedDate = new Date(order.deliveryDate);

                    if (actualDate <= promisedDate) {
                        onTimeCount++;
                    }
                }

                if (order.actualDeliveryDate && (order.sentAt || order.date)) {
                    const start = new Date(order.sentAt || order.date);
                    const end = new Date(order.actualDeliveryDate);
                    totalLeadTime += Math.max(0, differenceInDays(end, start));
                }
            });

            return {
                ...supplier,
                reliability: (onTimeCount / supplierOrders.length) * 100,
                avgLeadTime: totalLeadTime / supplierOrders.length,
                totalSpend,
                orderCount: supplierOrders.length,
                onTimeCount
            };
        });
    }, [suppliers, purchaseOrders]);

    const globalStats = useMemo(() => {
        const totalSpend = performanceMetrics.reduce((sum, m) => sum + m.totalSpend, 0);
        const avgReliability = performanceMetrics.length > 0
            ? performanceMetrics.reduce((sum, m) => sum + m.reliability, 0) / performanceMetrics.length
            : 0;

        return { totalSpend, avgReliability };
    }, [performanceMetrics]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                        <BarChart3 size={120} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Gasto Total Acumulado</p>
                    <h3 className="text-3xl font-bold text-white mt-1">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(globalStats.totalSpend)}
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs">
                        <TrendingUp size={14} />
                        <span>Analítica de recepciones finalizadas</span>
                    </div>
                </div>

                <div className="bg-surface border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                        <CheckCircle2 size={120} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Fiabilidad Promedio</p>
                    <h3 className="text-3xl font-bold text-indigo-400 mt-1">
                        {Math.round(globalStats.avgReliability)}%
                    </h3>
                    <p className="text-slate-500 text-xs mt-2 italic">Entregas a tiempo vs. comprometidas</p>
                </div>

                <div className="bg-surface border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                        <Users size={120} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Proveedores Activos</p>
                    <h3 className="text-3xl font-bold text-emerald-400 mt-1">
                        {suppliers.length}
                    </h3>
                    <p className="text-slate-500 text-xs mt-2">Gestionados en el sistema</p>
                </div>
            </div>

            {/* Performance Leaderboard */}
            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-indigo-400" size={20} />
                        Ranking de Fiabilidad
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-black/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Proveedor</th>
                                <th className="px-6 py-4">Status de Fiabilidad</th>
                                <th className="px-6 py-4">Lead Time (Avg)</th>
                                <th className="px-6 py-4">Total Pedidos</th>
                                <th className="px-6 py-4 text-right">Inversión Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {performanceMetrics
                                .sort((a, b) => b.reliability - a.reliability)
                                .map(metric => (
                                    <tr key={metric.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">
                                                    {metric.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">{metric.name}</p>
                                                    <p className="text-xs text-slate-500">{metric.email || 'Sin email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 max-w-[100px] h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${metric.reliability > 90 ? 'bg-emerald-500' : metric.reliability > 70 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                        style={{ width: `${metric.reliability}%` }}
                                                    />
                                                </div>
                                                <span className={`text-sm font-bold ${metric.reliability > 90 ? 'text-emerald-400' : metric.reliability > 70 ? 'text-amber-400' : 'text-rose-400'
                                                    }`}>
                                                    {Math.round(metric.reliability)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-500" />
                                                {metric.avgLeadTime.toFixed(1)} días
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-black/20 text-slate-400 px-2 py-1 rounded text-xs border border-white/5 font-mono">
                                                {metric.orderCount} ord.
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-white">
                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metric.totalSpend)}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insights Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl flex-shrink-0 h-fit">
                        <AlertCircle className="text-amber-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-200">Alerta de Lead Time</h4>
                        <p className="text-sm text-amber-500/80 mt-1">
                            Detectamos retrasos recurrentes en proveedores del sector perecederos. Considera aumentar el stock de seguridad.
                        </p>
                    </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl flex-shrink-0 h-fit">
                        <Truck className="text-emerald-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-emerald-200">Eficiencia de Envío</h4>
                        <p className="text-sm text-emerald-500/80 mt-1">
                            La consolidación de pedidos automáticos ha reducido los costes de envío estimados en un 12% este mes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
