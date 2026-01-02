import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { ShieldAlert, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AlertsWidget: React.FC = () => {
  const { haccpLogs, ingredients } = useStore();
  const navigate = useNavigate();
  // const today = new Date();

  const alerts = useMemo(() => {
    const list = [];

    // 1. HACCP Alerts
    const criticalLogs = haccpLogs.filter((l) => l.status === 'CRITICAL');

    if (criticalLogs.length > 0) {
      list.push({
        id: 'haccp-critical',
        type: 'critical',
        icon: ShieldAlert,
        title: 'Alerta HACCP',
        message: `${criticalLogs.length} desviaciones críticas registradas hoy.`,
        action: () => navigate('/haccp'),
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
      });
    }

    // 2. Low Stock Alerts
    const lowStockItems = ingredients.filter((i) => {
      const stock =
        typeof i.currentStock === 'number' ? i.currentStock : (i.currentStock as any)?.value || 0;
      const min = typeof i.minStock === 'number' ? i.minStock : (i.minStock as any)?.value || 0;
      return stock <= min && min > 0;
    });
    if (lowStockItems.length > 0) {
      list.push({
        id: 'low-stock',
        type: 'warning',
        icon: ShoppingCart,
        title: 'Stock Bajo',
        message: `${lowStockItems.length} insumos por debajo del stock mínimo.`,
        action: () => navigate('/inventory'),
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      });
    }

    // 3. Upcoming events without menu?
    // (Just a placeholder for logic)

    return list;
  }, [haccpLogs, ingredients, navigate]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          onClick={alert.action}
          className={`p-4 rounded-xl border ${alert.bgColor} ${alert.borderColor} flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all group`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${alert.bgColor} ${alert.color}`}>
              <alert.icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`font-bold text-sm ${alert.color}`}>{alert.title}</h4>
              <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                {alert.message}
              </p>
            </div>
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">
            Ver Detalles
          </button>
        </div>
      ))}
    </div>
  );
};
