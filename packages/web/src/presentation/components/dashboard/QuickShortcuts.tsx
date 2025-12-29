import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Scan, Package, Calendar } from 'lucide-react';

export const QuickShortcuts: React.FC = () => {
  const navigate = useNavigate();

  const shortcuts = [
    { label: 'Evento', icon: Calendar, action: () => navigate('/events'), color: 'bg-blue-500' },
    {
      label: 'Pedido',
      icon: ShoppingCart,
      action: () => navigate('/purchasing'),
      color: 'bg-emerald-500',
    },
    { label: 'Escanear', icon: Scan, action: () => navigate('/scanner'), color: 'bg-purple-500' },
    { label: 'Stock', icon: Package, action: () => navigate('/inventory'), color: 'bg-amber-500' },
  ];

  return (
    <div className="flex flex-wrap gap-4 items-center">
      {shortcuts.map((s, i) => (
        <button key={i} onClick={s.action} className="flex flex-col items-center gap-2 group">
          <div
            className={`p-4 rounded-2xl ${s.color} text-white shadow-lg shadow-${s.color.split('-')[1]}-500/20 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300`}
          >
            <s.icon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
            {s.label}
          </span>
        </button>
      ))}

      <button
        onClick={() => navigate('/events')}
        className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-primary/50 hover:text-white transition-all duration-300 group"
      >
        <div className="p-2 rounded-lg bg-primary/20 text-primary group-hover:scale-110 transition-transform">
          <Plus className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wide">Acción Rápida</span>
      </button>
    </div>
  );
};
