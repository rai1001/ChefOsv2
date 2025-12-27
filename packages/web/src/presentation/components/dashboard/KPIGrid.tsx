import React from 'react';
import { TrendingUp, DollarSign, Trash2, ShoppingCart, type LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    icon: LucideIcon;
    color: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, isPositive, icon: Icon, color }) => {
    return (
        <div className="premium-glass p-5 flex flex-col gap-3 group">
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg bg-${color}/10 border border-${color}/20 text-${color} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 shadow-[0_0_10px_rgba(var(--primary),0.3)]" />
                </div>
                {change && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {change}
                    </span>
                )}
            </div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-white mt-1 tracking-tight text-glow">
                    {value}
                </h3>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

export const KPIGrid: React.FC = () => {
    // These would eventually come from Task 1 (Jules' cached Summary)
    const metrics = [
        { title: 'Ventas Hoy', value: '€2,450', change: '+12.5%', isPositive: true, icon: TrendingUp, color: 'primary' },
        { title: 'Food Cost %', value: '28.4%', change: '-2.1%', isPositive: true, icon: DollarSign, color: 'accent' },
        { title: 'Mermas', value: '€142', change: '+5%', isPositive: false, icon: Trash2, color: 'rose-500' },
        { title: 'Pedidos Activos', value: '12', icon: ShoppingCart, color: 'emerald-500' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0">
            {metrics.map((m, i) => (
                <div key={i} className="fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <KPICard {...m} color={m.color} />
                </div>
            ))}
        </div>
    );
};
