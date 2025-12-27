import React from 'react';
import { Sparkles, ShoppingCart, Thermometer } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';

export const ChefInsights: React.FC = () => {
    const { inventory, haccpLogs, activeOutletId } = useStore();

    const insights = React.useMemo(() => {
        const list = [];
        const scopedInventory = inventory.filter(item => !activeOutletId || item.outletId === activeOutletId);

        // 1. Price Increase Insight (Keep using master ingredients price history if available)
        // ... (Price logic remains if needed, but low stock is the priority)

        // 2. HACCP Critical Temp Insight
        const recentCriticalLogs = haccpLogs.filter(log => {
            const isCritical = log.status === 'CRITICAL';
            const isRecent = new Date(log.timestamp).getTime() > Date.now() - 2 * 60 * 60 * 1000; // Last 2 hours
            return isCritical && isRecent;
        });

        if (recentCriticalLogs.length > 0) {
            list.push({
                id: 'haccp-critical',
                type: 'error',
                icon: <Thermometer className="w-4 h-4 text-red-500" />,
                title: 'Crítico HACCP',
                description: `${recentCriticalLogs.length} cámaras en temperatura crítica.`,
                actionLabel: 'Ver Registros'
            });
        }

        // 3. Low Stock Insight (NOW USING DECOUPLED INVENTORY)
        const lowStock = scopedInventory.filter(item => (item.stock || 0) <= (item.minStock || 0));
        if (lowStock.length > 0) {
            list.push({
                id: 'low-stock',
                type: 'info',
                icon: <ShoppingCart className="w-4 h-4 text-primary" />,
                title: 'Bajo Stock',
                description: `Hay ${lowStock.length} productos bajo el mínimo establecido.`,
                actionLabel: 'Pedir'
            });
        }

        return list;
    }, [inventory, haccpLogs, activeOutletId]);

    if (insights.length === 0) return (
        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
            <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Chef AI está analizando...</span>
            </div>
            <p className="text-xs text-slate-400">Todo parece estar en orden en la cocina hoy.</p>
        </div>
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary text-sm font-bold px-1">
                <Sparkles className="w-4 h-4 animate-glow" />
                <span>CHEF AI INSIGHTS</span>
            </div>

            <div className="space-y-2">
                {insights.map(insight => (
                    <div
                        key={insight.id}
                        className="glass-card p-3 border-l-4 border-l-primary hover:translate-x-1 transition-transform cursor-pointer group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-1">{insight.icon}</div>
                            <div className="flex-1">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{insight.title}</h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {insight.description}
                                </p>
                                <button className="text-[10px] text-primary font-bold mt-2 hover:underline">
                                    {insight.actionLabel} →
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
